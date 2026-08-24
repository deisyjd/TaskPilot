import { createHash, randomBytes } from 'crypto'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import type { SessionPayload } from '@/lib/auth'
import { getCachedSession } from '@/lib/sessionCache'

const TOKEN_PREFIX = 'tp_live_'

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

// Devuelve el token en claro (se muestra una sola vez) y su hash (lo que se
// guarda en la BD).
export function generateApiToken(): { raw: string; hash: string } {
  const raw = `${TOKEN_PREFIX}${randomBytes(24).toString('base64url')}`
  return { raw, hash: hashToken(raw) }
}

// Resuelve una sesión a partir del header `Authorization: Bearer tp_live_...`.
// El token va atado a una empresa; el rol se toma de la membresía VIGENTE del
// usuario en esa empresa (si lo sacaron de la empresa, el token deja de valer).
export async function sessionFromBearer(): Promise<SessionPayload | null> {
  const header = (await headers()).get('authorization')
  if (!header?.startsWith('Bearer ')) return null

  const raw = header.slice('Bearer '.length).trim()
  if (!raw.startsWith(TOKEN_PREFIX)) return null

  const hash = hashToken(raw)
  return getCachedSession(hash, () => resolveBearerSession(hash))
}

// Resolución real contra la BD (solo corre en cache-miss). El rol se toma de la
// membresía VIGENTE del usuario en la empresa del token: si lo sacaron de la
// empresa, el token deja de valer (a más tardar al expirar el TTL de la caché).
async function resolveBearerSession(hash: string): Promise<SessionPayload | null> {
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  })
  if (!token) return null
  if (token.expiresAt && token.expiresAt.getTime() < Date.now()) return null
  if (token.user.status !== 'active') return null

  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: token.userId, companyId: token.companyId } },
  })
  if (!membership) return null

  // Último uso: solo se escribe en cache-miss (~1 vez por TTL), no en cada
  // request. Best-effort; no bloquea ni rompe si falla.
  prisma.apiToken
    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  return {
    userId: token.userId,
    email: token.user.email,
    userRole: membership.role,
    activeCompanyId: token.companyId,
  }
}
