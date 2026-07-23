import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendDailyDigestToUser } from '@/lib/dailyDigest'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: id, companyId: session.activeCompanyId } },
  })
  if (!membership) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const result = await sendDailyDigestToUser(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
