import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { verifyTotpCode } from '@/lib/twoFactor'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { password, code } = await req.json()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const passwordOk = password ? await bcrypt.compare(password, user.password) : false
  const codeOk = !passwordOk && code && user.twoFactorSecret ? await verifyTotpCode(user.twoFactorSecret, code) : false

  if (!passwordOk && !codeOk) {
    return NextResponse.json({ error: 'Contraseña o código inválido' }, { status: 401 })
  }

  await prisma.$transaction([
    prisma.twoFactorBackupCode.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } }),
  ])

  return NextResponse.json({ ok: true })
}
