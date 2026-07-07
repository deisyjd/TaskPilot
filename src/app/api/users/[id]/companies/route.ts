import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params

  // Solo se listan empresas donde quien pide esto es admin — no se puede
  // dar/quitar acceso a una empresa que uno mismo no administra.
  const adminMemberships = await prisma.companyMembership.findMany({
    where: { userId: session.userId, role: 'admin' },
    include: { company: { select: { id: true, name: true, color: true } } },
  })

  const targetMemberships = await prisma.companyMembership.findMany({
    where: { userId: id, companyId: { in: adminMemberships.map((m) => m.companyId) } },
    select: { companyId: true, role: true },
  })
  const roleByCompany = new Map(targetMemberships.map((m) => [m.companyId, m.role]))

  const result = adminMemberships.map((m) => ({
    companyId: m.company.id,
    name: m.company.name,
    color: m.company.color,
    role: roleByCompany.get(m.companyId) ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const { companyId, role } = await req.json()
  if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })

  const requesterMembership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: session.userId, companyId } },
  })
  if (!requesterMembership || requesterMembership.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos sobre esa empresa' }, { status: 403 })
  }

  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (!targetUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const membership = await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: id, companyId } },
    update: { role: role ?? 'member' },
    create: { userId: id, companyId, role: role ?? 'member' },
  })

  return NextResponse.json({ companyId, role: membership.role }, { status: 201 })
}
