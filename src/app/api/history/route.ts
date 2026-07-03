import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const events = await prisma.historyEvent.findMany({
    where: { companyId: session.activeCompanyId },
    orderBy: { timestamp: 'desc' },
    take: 200,
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { companyId: _drop, ...body } = await req.json()
  const event = await prisma.historyEvent.create({ data: { ...body, companyId: session.activeCompanyId } })
  return NextResponse.json(event, { status: 201 })
}
