import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

  if (!user || user.status !== 'active') {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: user.id },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  })

  if (memberships.length === 0) {
    return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 })
  }

  const active = memberships.find((m) => m.companyId === user.lastActiveCompanyId) ?? memberships[0]

  await createSession({ userId: user.id, email: user.email, userRole: active.role, activeCompanyId: active.companyId })
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveCompanyId: active.companyId } })

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      userRole: active.role,
      initials: user.initials,
      color: user.color,
      avatarUrl: user.avatarUrl,
      status: user.status,
    },
    activeCompanyId: active.companyId,
    companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name, slug: m.company.slug, color: m.company.color, role: m.role })),
  })
}
