import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// RFC 7591 — Dynamic Client Registration. Clientes públicos (Claude) usan PKCE,
// sin client_secret.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const redirectUris: string[] = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u: unknown): u is string => typeof u === 'string')
    : []
  if (redirectUris.length === 0) {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'redirect_uris es requerido' },
      { status: 400, headers: CORS }
    )
  }
  const name = typeof body.client_name === 'string' && body.client_name.trim() ? body.client_name.trim() : 'Cliente MCP'

  const client = await prisma.oAuthClient.create({ data: { name, redirectUris: JSON.stringify(redirectUris) } })

  return NextResponse.json(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: name,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
    { status: 201, headers: CORS }
  )
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
