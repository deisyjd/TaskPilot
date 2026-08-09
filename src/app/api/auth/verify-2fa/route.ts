import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPendingTwoFactorUserId, deletePendingTwoFactorToken } from '@/lib/auth'
import { completeLogin } from '@/lib/loginSuccess'
import { verifyTotpCode, verifyBackupCode } from '@/lib/twoFactor'

export async function POST(req: NextRequest) {
  const userId = await getPendingTwoFactorUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Sesión de verificación expirada. Inicia sesión de nuevo.' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: 'Sesión de verificación inválida' }, { status: 401 })
  }

  let valid = await verifyTotpCode(user.twoFactorSecret, code)

  if (!valid) {
    const backupCodes = await prisma.twoFactorBackupCode.findMany({
      where: { userId: user.id, usedAt: null },
    })
    for (const backup of backupCodes) {
      if (await verifyBackupCode(code, backup.codeHash)) {
        await prisma.twoFactorBackupCode.update({ where: { id: backup.id }, data: { usedAt: new Date() } })
        valid = true
        break
      }
    }
  }

  if (!valid) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 401 })
  }

  await deletePendingTwoFactorToken()

  const result = await completeLogin(user.id)
  if (!result) {
    return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 })
  }

  return NextResponse.json(result)
}
