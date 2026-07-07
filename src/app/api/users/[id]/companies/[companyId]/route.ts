import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string; companyId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id, companyId } = await params

  const requesterMembership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: session.userId, companyId } },
  })
  if (!requesterMembership || requesterMembership.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos sobre esa empresa' }, { status: 403 })
  }

  const target = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: id, companyId } },
  })
  if (!target) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (target.role === 'admin') {
    const adminCount = await prisma.companyMembership.count({ where: { companyId, role: 'admin' } })
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'No puedes quitar al único administrador de esa empresa' }, { status: 400 })
    }
  }

  await prisma.companyMembership.delete({ where: { userId_companyId: { userId: id, companyId } } })
  return NextResponse.json({ ok: true })
}
