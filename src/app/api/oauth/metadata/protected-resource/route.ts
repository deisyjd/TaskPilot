import { NextRequest, NextResponse } from 'next/server'
import { getAppBaseUrl } from '@/lib/googleOAuth'

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// RFC 9728 — OAuth 2.0 Protected Resource Metadata (para descubrimiento MCP).
export function GET(req: NextRequest) {
  const base = getAppBaseUrl(req)
  return NextResponse.json(
    {
      resource: `${base}/api/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ['header'],
      scopes_supported: ['mcp'],
    },
    { headers: CORS }
  )
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
