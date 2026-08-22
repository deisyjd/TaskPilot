import { NextResponse } from 'next/server'
import { getSession, createSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
  }

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: user.id },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  })

  if (memberships.length === 0) {
    return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 })
  }

  let active = memberships.find((m) => m.companyId === session.activeCompanyId)
  if (!active) {
    active = memberships[0]
    await createSession({ userId: user.id, email: user.email, userRole: active.role, activeCompanyId: active.companyId })
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    userRole: active.role,
    initials: user.initials,
    color: user.color,
    avatarUrl: user.avatarUrl,
    status: user.status,
    activeCompanyId: active.companyId,
    companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name, slug: m.company.slug, color: m.company.color, role: m.role })),
  })
}
