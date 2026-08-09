import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

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
  if (!token) return null
  return verifyToken(token)
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ─── 2FA pendiente ──────────────────────────────────────────────
// Token de vida corta, separado de la sesión real — se emite justo después
// de validar el password si el usuario tiene 2FA activado, y solo sirve
// para probar el código de 6 dígitos. Nunca se puede usar como sesión
// (lleva su propio `purpose`, y `getSession()` no lo lee).
const PENDING_2FA_COOKIE = 'wipli-2fa-pending'
const PENDING_2FA_MAX_AGE = 60 * 5 // 5 minutos

interface PendingTwoFactorPayload {
  userId: string
  purpose: 'pending-2fa'
}

export async function createPendingTwoFactorToken(userId: string) {
  const payload: PendingTwoFactorPayload = { userId, purpose: 'pending-2fa' }
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(SECRET)

  const cookieStore = await cookies()
  cookieStore.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PENDING_2FA_MAX_AGE,
    path: '/',
  })
}

export async function getPendingTwoFactorUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(PENDING_2FA_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const data = payload as unknown as PendingTwoFactorPayload
    if (data.purpose !== 'pending-2fa') return null
    return data.userId
  } catch {
    return null
  }
}

export async function deletePendingTwoFactorToken() {
  const cookieStore = await cookies()
  cookieStore.delete(PENDING_2FA_COOKIE)
}
