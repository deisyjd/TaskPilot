import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { isGoogleLoginEnabled, getAppBaseUrl, getRedirectUri, buildGoogleAuthUrl } from '@/lib/googleOAuth'

// Cookie de vida corta para el parámetro `state` (protección CSRF del flujo
// OAuth). SameSite=lax para que sobreviva a la navegación de vuelta desde Google.
const STATE_COOKIE = 'wipli-oauth-state'

export async function GET(req: NextRequest) {
  if (!isGoogleLoginEnabled()) {
    return NextResponse.redirect(`${getAppBaseUrl(req)}/login?error=google_unavailable`)
  }

  const state = crypto.randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutos
    path: '/',
  })

  return NextResponse.redirect(buildGoogleAuthUrl(getRedirectUri(req), state))
}
