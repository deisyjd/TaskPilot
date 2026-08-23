import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { completeLogin } from '@/lib/loginSuccess'
import { isGoogleLoginEnabled, getAppBaseUrl, getRedirectUri, fetchGoogleIdentity } from '@/lib/googleOAuth'

const STATE_COOKIE = 'wipli-oauth-state'
const NEXT_COOKIE = 'wipli-oauth-next'

export async function GET(req: NextRequest) {
  const base = getAppBaseUrl(req)
  const fail = (code: string) => NextResponse.redirect(`${base}/login?error=${code}`)

  if (!isGoogleLoginEnabled()) {
    return fail('google_unavailable')
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(STATE_COOKIE)?.value
  const nextPath = cookieStore.get(NEXT_COOKIE)?.value
  cookieStore.delete(STATE_COOKIE)
  cookieStore.delete(NEXT_COOKIE)

  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  // El usuario canceló en la pantalla de Google, o algo falló allá.
  if (searchParams.get('error') || !code) {
    return fail('google_cancelled')
  }

  // Protección CSRF: el state devuelto debe coincidir con el que emitimos.
  if (!state || !expectedState || state !== expectedState) {
    return fail('google_state')
  }

  const identity = await fetchGoogleIdentity(code, getRedirectUri(req))
  if (!identity || !identity.emailVerified) {
    return fail('google_failed')
  }

  // Invitación-solo: solo entran correos que ya son usuarios activos de Wipli.
  const user = await prisma.user.findUnique({ where: { email: identity.email } })
  if (!user || user.status !== 'active') {
    return fail('google_no_account')
  }

  const result = await completeLogin(user.id)
  if (!result) {
    return fail('no_company')
  }

  const dest = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard'
  return NextResponse.redirect(`${base}${dest}`)
}
