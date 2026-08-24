import { NextRequest, NextResponse, after } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/welcomeEmail'
import { getOrSet, invalidate } from '@/lib/cache'
import { usersCacheKey } from '@/lib/cacheKeys'

// TTL corto de respaldo: aunque invalidamos explícitamente en cada mutación de
// usuarios/membresías, el TTL acota cualquier ruta de cambio que se nos escape.
const USERS_TTL_SECONDS = 60

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Este endpoint lo sondean todos los clientes cada ~30s y la lista cambia rara
  // vez: se cachea por empresa para no pegarle a Postgres en cada sondeo.
  const users = await getOrSet(usersCacheKey(session.activeCompanyId), USERS_TTL_SECONDS, async () => {
    const memberships = await prisma.companyMembership.findMany({
      where: { companyId: session.activeCompanyId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, initials: true, color: true, avatarUrl: true, status: true, dailyDigestEmail: true, taskAssignedEmail: true, createdAt: true, updatedAt: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })
    return memberships.map((m) => ({ ...m.user, userRole: m.role }))
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, confirmPassword, role, userRole, initials, color, status } = body

  if (!email) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase()
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  let isNewUser = false

  if (user) {
    const already = await prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: session.activeCompanyId } },
    })
    if (already) return NextResponse.json({ error: 'El usuario ya pertenece a esta empresa' }, { status: 409 })
  } else {
    if (!name || !password) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }
    // Coincidencia con "repetir contraseña" — el cliente ya lo valida, pero lo
    // reforzamos aquí para que la regla sea autoritativa.
    if (confirmPassword !== undefined && confirmPassword !== password) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }
    const hashed = await bcrypt.hash(password, 12)
    user = await prisma.user.create({
      data: { name, email: normalizedEmail, password: hashed, role, initials, color: color ?? 'bg-violet-500', status: status ?? 'active' },
    })
    isNewUser = true
  }

  const membership = await prisma.companyMembership.create({
    data: { userId: user.id, companyId: session.activeCompanyId, role: userRole ?? 'member' },
  })

  await invalidate(usersCacheKey(session.activeCompanyId))

  // Correo de bienvenida / invitación (no bloquea la respuesta). A los usuarios
  // nuevos les llega su contraseña temporal; a los ya existentes, solo el aviso
  // de que ahora tienen acceso a esta empresa.
  const recipient = user
  after(async () => {
    const [company, inviter] = await Promise.all([
      prisma.company.findUnique({ where: { id: session.activeCompanyId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    ])
    await sendWelcomeEmail({
      toEmail: recipient.email,
      recipientName: recipient.name,
      invitedByName: inviter?.name ?? 'Tu equipo',
      companyName: company?.name ?? 'Wipli',
      tempPassword: isNewUser ? password : null,
    })
  })

  const { password: _pw, ...userWithoutPassword } = user
  return NextResponse.json({ ...userWithoutPassword, userRole: membership.role }, { status: 201 })
}
