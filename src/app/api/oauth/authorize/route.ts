import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getAppBaseUrl } from '@/lib/googleOAuth'

export const dynamic = 'force-dynamic'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface AuthzParams {
  clientId: string
  redirectUri: string
  codeChallenge: string
  codeChallengeMethod: string
  state: string
  scope: string
}

async function validate(clientId: string, redirectUri: string) {
  if (!clientId || !redirectUri) return null
  const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } })
  if (!client) return null
  const allowed: string[] = JSON.parse(client.redirectUris)
  if (!allowed.includes(redirectUri)) return null
  return client
}

function errorPage(message: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:40px;color:#111318;background:#F4F7F2"><h2>No se pudo autorizar</h2><p>${esc(message)}</p></body>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

// GET: valida, exige sesión y muestra la pantalla de consentimiento.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const responseType = p.get('response_type') ?? ''
  const clientId = p.get('client_id') ?? ''
  const redirectUri = p.get('redirect_uri') ?? ''
  const codeChallenge = p.get('code_challenge') ?? ''
  const codeChallengeMethod = p.get('code_challenge_method') ?? 'S256'
  const state = p.get('state') ?? ''
  const scope = p.get('scope') ?? 'mcp'

  if (responseType !== 'code') return errorPage('response_type debe ser "code".')
  if (!codeChallenge) return errorPage('Falta code_challenge (PKCE requerido).')

  const client = await validate(clientId, redirectUri)
  if (!client) return errorPage('client_id o redirect_uri inválido.')

  const session = await getSession()
  if (!session) {
    const next = `${req.nextUrl.pathname}${req.nextUrl.search}`
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, getAppBaseUrl(req)))
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } })
  const cancelUrl = `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}error=access_denied${state ? `&state=${encodeURIComponent(state)}` : ''}`
  const hidden = (name: string, value: string) => `<input type="hidden" name="${name}" value="${esc(value)}" />`

  return new NextResponse(
    `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Conectar con Wipli</title></head>
<body style="margin:0;background:#F4F7F2;font-family:Poppins,system-ui,sans-serif;">
  <div style="max-width:440px;margin:8vh auto;background:#fff;border:1px solid #E7ECE4;border-radius:24px;overflow:hidden;">
    <div style="background:#111318;padding:22px 24px;color:#fff;font-weight:800;font-size:20px;">Wip<span style="color:#DFFF5F;">li</span></div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111318;">Conectar ${esc(client.name)}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6B7280;line-height:1.5;">
        <strong>${esc(client.name)}</strong> quiere acceder a tus proyectos, tareas, notas y recordatorios en Wipli,
        actuando como <strong>${esc(user?.name ?? user?.email ?? 'ti')}</strong> sobre tu empresa activa.
      </p>
      <form method="post" style="display:flex;gap:10px;">
        ${hidden('client_id', clientId)}
        ${hidden('redirect_uri', redirectUri)}
        ${hidden('code_challenge', codeChallenge)}
        ${hidden('code_challenge_method', codeChallengeMethod)}
        ${hidden('state', state)}
        ${hidden('scope', scope)}
        <a href="${esc(cancelUrl)}" style="flex:1;text-align:center;padding:12px;border-radius:999px;background:#EEF3ED;color:#6B7280;text-decoration:none;font-weight:600;font-size:14px;">Cancelar</a>
        <button type="submit" style="flex:1;padding:12px;border:0;border-radius:999px;background:#111318;color:#DFFF5F;font-weight:700;font-size:14px;cursor:pointer;">Autorizar</button>
      </form>
    </div>
  </div>
</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

// POST: el usuario aprobó → emite el código de autorización y redirige.
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const params: AuthzParams = {
    clientId: String(form.get('client_id') ?? ''),
    redirectUri: String(form.get('redirect_uri') ?? ''),
    codeChallenge: String(form.get('code_challenge') ?? ''),
    codeChallengeMethod: String(form.get('code_challenge_method') ?? 'S256'),
    state: String(form.get('state') ?? ''),
    scope: String(form.get('scope') ?? 'mcp'),
  }

  const client = await validate(params.clientId, params.redirectUri)
  if (!client) return errorPage('client_id o redirect_uri inválido.')

  const session = await getSession()
  if (!session) {
    const next = `${req.nextUrl.pathname}${req.nextUrl.search}`
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, getAppBaseUrl(req)))
  }

  const code = randomBytes(32).toString('base64url')
  await prisma.oAuthAuthCode.create({
    data: {
      code,
      clientId: params.clientId,
      userId: session.userId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      scope: params.scope,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
    },
  })

  const url = `${params.redirectUri}${params.redirectUri.includes('?') ? '&' : '?'}code=${encodeURIComponent(code)}${params.state ? `&state=${encodeURIComponent(params.state)}` : ''}`
  return NextResponse.redirect(url, { status: 302 })
}
