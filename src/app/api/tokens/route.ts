import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateApiToken } from '@/lib/apiTokens'

// Lista los tokens del usuario para la empresa activa (sin el hash ni el token
// en claro — ese solo se ve una vez, al crearlo).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.userId, companyId: session.activeCompanyId },
    select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tokens)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Token MCP'
  const days = Number(body.expiresInDays)
  const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86400000) : null

  const { raw, hash } = generateApiToken()
  const created = await prisma.apiToken.create({
    data: { userId: session.userId, companyId: session.activeCompanyId, name, tokenHash: hash, expiresAt },
    select: { id: true, name: true, expiresAt: true, createdAt: true },
  })

  // El token en claro se devuelve una sola vez.
  return NextResponse.json({ ...created, token: raw }, { status: 201 })
}
