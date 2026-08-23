import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPkce, issueOAuthTokens, refreshOAuthTokens } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

function tokenError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: CORS })
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const grantType = String(form.get('grant_type') ?? '')

  if (grantType === 'authorization_code') {
    const code = String(form.get('code') ?? '')
    const redirectUri = String(form.get('redirect_uri') ?? '')
    const clientId = String(form.get('client_id') ?? '')
    const verifier = String(form.get('code_verifier') ?? '')

    const authCode = await prisma.oAuthAuthCode.findUnique({ where: { code } })
    if (!authCode) return tokenError('invalid_grant', 'Código inválido')
    // Un solo uso: se borra pase lo que pase.
    await prisma.oAuthAuthCode.delete({ where: { code } }).catch(() => {})

    if (authCode.expiresAt.getTime() < Date.now()) return tokenError('invalid_grant', 'Código expirado')
    if (authCode.clientId !== clientId) return tokenError('invalid_grant', 'client_id no coincide')
    if (authCode.redirectUri !== redirectUri) return tokenError('invalid_grant', 'redirect_uri no coincide')
    if (!verifyPkce(verifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
      return tokenError('invalid_grant', 'PKCE inválido')
    }

    const { accessToken, refreshToken, expiresIn } = await issueOAuthTokens(authCode.clientId, authCode.userId, authCode.scope)
    return NextResponse.json(
      { access_token: accessToken, token_type: 'Bearer', expires_in: expiresIn, refresh_token: refreshToken, scope: authCode.scope ?? 'mcp' },
      { headers: CORS }
    )
  }

  if (grantType === 'refresh_token') {
    const result = await refreshOAuthTokens(String(form.get('refresh_token') ?? ''))
    if (!result) return tokenError('invalid_grant', 'refresh_token inválido')
    return NextResponse.json(
      { access_token: result.accessToken, token_type: 'Bearer', expires_in: result.expiresIn, refresh_token: result.refreshToken, scope: 'mcp' },
      { headers: CORS }
    )
  }

  return tokenError('unsupported_grant_type', 'grant_type no soportado')
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
