import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: id, companyId: session.activeCompanyId } },
  })
  if (!membership) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const { password, userRole } = body

  // Whitelist: el cliente envía campos que no son columnas del modelo User
  const userData: Record<string, unknown> = {}
  for (const key of ['name', 'role', 'initials', 'color', 'avatarUrl', 'status', 'dailyDigestEmail', 'taskAssignedEmail']) {
    if (key in body) userData[key] = body[key]
  }
  if (body.email) userData.email = body.email.toLowerCase()
  if (password) userData.password = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id },
    data: userData,
    select: { id: true, name: true, email: true, role: true, initials: true, color: true, avatarUrl: true, status: true, dailyDigestEmail: true, taskAssignedEmail: true, createdAt: true, updatedAt: true },
  })

  let finalRole = membership.role
  if (userRole) {
    const updated = await prisma.companyMembership.update({ where: { id: membership.id }, data: { role: userRole } })
    finalRole = updated.role
  }

  return NextResponse.json({ ...user, userRole: finalRole })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const result = await prisma.companyMembership.deleteMany({ where: { userId: id, companyId: session.activeCompanyId } })
  if (result.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
