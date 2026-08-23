import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'wipli-jwt-secret-2025-super-secure-key'
)

const COOKIE_NAME = 'wipli-session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  userId: string
  email: string
  userRole: string
  activeCompanyId: string
}

export async function signToken(payload: SessionPayload) {
  return new SignJWT(payload as Parameters<SignJWT['setSubject']>[0] extends string ? never : Record<string, unknown> & SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(payload: SessionPayload) {
  const token = await signToken(payload)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (token) {
    const session = await verifyToken(token)
    if (session) return session
  }
  // Sin cookie válida: intenta un token del header Authorization.
  // Puede ser un access token OAuth (tp_oauth_) o un PAT (tp_live_).
  // Import diferido para no cargar Prisma en cada verificación de cookie.
  const header = (await headers()).get('authorization')
  const bearer = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (bearer.startsWith('tp_oauth_')) {
    const { sessionFromOAuthToken } = await import('@/lib/oauth')
    return sessionFromOAuthToken(bearer)
  }
  const { sessionFromBearer } = await import('@/lib/apiTokens')
  return sessionFromBearer()
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
