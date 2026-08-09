import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'
import { generateTotpSecret, buildOtpauthUri } from '@/lib/twoFactor'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { password } = await req.json()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const valid = await bcrypt.compare(password ?? '', user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const secret = generateTotpSecret()
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: encrypt(secret) } })

  const otpauthUri = buildOtpauthUri(user.email, secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri)

  return NextResponse.json({ secret, qrCodeDataUrl })
}
