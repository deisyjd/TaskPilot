import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
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

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    userRole: user.userRole,
    initials: user.initials,
    color: user.color,
    avatarUrl: user.avatarUrl,
    status: user.status,
  })
}
