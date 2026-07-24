import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const memberships = await prisma.companyMembership.findMany({
    where: { companyId: session.activeCompanyId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, initials: true, color: true, avatarUrl: true, status: true, dailyDigestEmail: true, taskAssignedEmail: true, createdAt: true, updatedAt: true },
      },
    },
    orderBy: { user: { name: 'asc' } },
  })

  const users = memberships.map((m) => ({ ...m.user, userRole: m.role }))
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role, userRole, initials, color, status } = body

  if (!email) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase()
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (user) {
    const already = await prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: session.activeCompanyId } },
    })
    if (already) return NextResponse.json({ error: 'El usuario ya pertenece a esta empresa' }, { status: 409 })
  } else {
    if (!name || !password) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }
    const hashed = await bcrypt.hash(password, 12)
    user = await prisma.user.create({
      data: { name, email: normalizedEmail, password: hashed, role, initials, color: color ?? 'bg-violet-500', status: status ?? 'active' },
    })
  }

  const membership = await prisma.companyMembership.create({
    data: { userId: user.id, companyId: session.activeCompanyId, role: userRole ?? 'member' },
  })

  const { password: _pw, ...userWithoutPassword } = user
  return NextResponse.json({ ...userWithoutPassword, userRole: membership.role }, { status: 201 })
}
