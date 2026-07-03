import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, userRole: true,
      initials: true, color: true, avatarUrl: true, status: true,
      createdAt: true, updatedAt: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role, userRole, initials, color, status } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), password: hashed, role, userRole: userRole ?? 'member', initials, color: color ?? 'bg-violet-500', status: status ?? 'active' },
    select: { id: true, name: true, email: true, role: true, userRole: true, initials: true, color: true, avatarUrl: true, status: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
