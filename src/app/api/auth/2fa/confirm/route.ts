import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { verifyTotpCode, generateBackupCodes, hashBackupCodes } from '@/lib/twoFactor'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { code } = await req.json()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.twoFactorSecret) {
    return NextResponse.json({ error: 'Primero inicia la configuración de 2FA' }, { status: 400 })
  }

  const valid = await verifyTotpCode(user.twoFactorSecret, code ?? '')
  if (!valid) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
  }

  const backupCodes = generateBackupCodes()
  const hashed = await hashBackupCodes(backupCodes)

  await prisma.$transaction([
    prisma.twoFactorBackupCode.deleteMany({ where: { userId: user.id } }),
    prisma.twoFactorBackupCode.createMany({ data: hashed.map((codeHash) => ({ userId: user.id, codeHash })) }),
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } }),
  ])

  return NextResponse.json({ ok: true, backupCodes })
}
