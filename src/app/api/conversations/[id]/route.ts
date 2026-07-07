import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { findParticipantConversation, serializeConversation } from '@/lib/chat'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const conversation = await findParticipantConversation(id, session.userId, session.activeCompanyId)
  if (!conversation) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['name', 'coverImageUrl']) {
    if (key in body) data[key] = body[key]
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data,
    include: { participants: { include: { user: { select: { name: true } } } } },
  })

  return NextResponse.json(await serializeConversation(updated, session.userId))
}
