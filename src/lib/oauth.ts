import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { SessionPayload } from '@/lib/auth'
import { getCachedSession, invalidateSessionCache } from '@/lib/sessionCache'

// Servidor OAuth 2.1 mínimo (authorization code + PKCE) para conectores MCP.
// Convive con los PAT (tp_live_): es un método de auth adicional para /api/mcp.

const ACCESS_TTL_MS = 60 * 60 * 1000 // 1 hora
export const ACCESS_TTL_SECONDS = Math.floor(ACCESS_TTL_MS / 1000)

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

function randomToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString('base64url')}`
}

// Verificación PKCE (S256 por defecto).
export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (!verifier || !challenge) return false
  if (method === 'plain') return verifier === challenge
  return createHash('sha256').update(verifier).digest('base64url') === challenge
}

export async function issueOAuthTokens(clientId: string, userId: string, scope: string | null) {
  const accessToken = randomToken('tp_oauth_')
  const refreshToken = randomToken('tp_ref_')
  await prisma.oAuthToken.create({
    data: {
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      clientId,
      userId,
      scope,
      expiresAt: new Date(Date.now() + ACCESS_TTL_MS),
    },
  })
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS }
}

// Rota un refresh token por un nuevo par (invalida el anterior).
export async function refreshOAuthTokens(rawRefresh: string) {
  const existing = await prisma.oAuthToken.findUnique({ where: { refreshTokenHash: hashToken(rawRefresh) } })
  if (!existing) return null
  await prisma.oAuthToken.delete({ where: { id: existing.id } })
  // El access token que se rota puede estar cacheado: invalídalo al instante.
  await invalidateSessionCache(existing.accessTokenHash)
  return issueOAuthTokens(existing.clientId, existing.userId, existing.scope)
}

// Resuelve una sesión desde un access token OAuth (tp_oauth_...). Actúa sobre
// la empresa ACTIVA del usuario (lastActiveCompanyId, o la primera membresía).
export async function sessionFromOAuthToken(raw: string): Promise<SessionPayload | null> {
  const hash = hashToken(raw)
  return getCachedSession(hash, () => resolveOAuthSession(hash))
}

// Resolución real contra la BD (solo corre en cache-miss).
async function resolveOAuthSession(hash: string): Promise<SessionPayload | null> {
  const token = await prisma.oAuthToken.findUnique({
    where: { accessTokenHash: hash },
    include: { user: true },
  })
  if (!token) return null
  if (token.expiresAt.getTime() < Date.now()) return null
  if (token.user.status !== 'active') return null

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: token.userId },
    orderBy: { createdAt: 'asc' },
  })
  if (memberships.length === 0) return null
  const active = memberships.find((m) => m.companyId === token.user.lastActiveCompanyId) ?? memberships[0]

  // Último uso: solo en cache-miss (~1 vez por TTL), no en cada request.
  prisma.oAuthToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return { userId: token.userId, email: token.user.email, userRole: active.role, activeCompanyId: active.companyId }
}
