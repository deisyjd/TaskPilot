import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, createSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  if (id !== session.activeCompanyId) {
    return NextResponse.json({ error: 'Solo puedes editar la empresa activa' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['name', 'color']) {
    if (key in body) data[key] = body[key]
  }
  if (typeof data.name === 'string' && !data.name.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const company = await prisma.company.update({ where: { id }, data })
  return NextResponse.json({ id: company.id, name: company.name, slug: company.slug, color: company.color })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  if (id !== session.activeCompanyId) {
    return NextResponse.json({ error: 'Solo puedes eliminar la empresa activa' }, { status: 403 })
  }

  const membershipCount = await prisma.companyMembership.count({ where: { userId: session.userId } })
  if (membershipCount <= 1) {
    return NextResponse.json({ error: 'No puedes eliminar tu única empresa' }, { status: 400 })
  }

  await prisma.company.delete({ where: { id } })

  const nextMembership = await prisma.companyMembership.findFirst({ where: { userId: session.userId } })
  const activeCompanyId = nextMembership!.companyId
  const userRole = nextMembership!.role

  await createSession({ userId: session.userId, email: session.email, userRole, activeCompanyId })
  await prisma.user.update({ where: { id: session.userId }, data: { lastActiveCompanyId: activeCompanyId } })

  return NextResponse.json({ activeCompanyId, userRole })
}
