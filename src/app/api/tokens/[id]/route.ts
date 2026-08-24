import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { invalidateSessionCache } from '@/lib/sessionCache'

type Params = { params: Promise<{ id: string }> }

// Revoca (elimina) un token. Solo el dueño puede revocar los suyos.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  // Se lee el hash antes de borrar para invalidar la sesión cacheada: la
  // revocación debe surtir efecto al instante, no al expirar el TTL.
  const token = await prisma.apiToken.findFirst({
    where: { id, userId: session.userId },
    select: { tokenHash: true },
  })
  if (!token) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.apiToken.delete({ where: { id } })
  await invalidateSessionCache(token.tokenHash)

  return NextResponse.json({ ok: true })
}
