import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { findParticipantConversation, serializeMessage } from '@/lib/chat'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const conversation = await findParticipantConversation(id, session.userId, session.activeCompanyId)
  if (!conversation) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(messages.map(serializeMessage))
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const conversation = await findParticipantConversation(id, session.userId, session.activeCompanyId)
  if (!conversation) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { content, attachments, links } = await req.json()
  const hasContent = typeof content === 'string' && content.trim().length > 0
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0
  const hasLinks = Array.isArray(links) && links.length > 0
  if (!hasContent && !hasAttachments && !hasLinks) {
    return NextResponse.json({ error: 'El mensaje está vacío' }, { status: 400 })
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: session.userId,
      content: content ?? '',
      attachments: hasAttachments ? attachments : undefined,
      links: hasLinks ? links : undefined,
    },
  })

  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } })
  // El emisor no debería contar su propio mensaje como no leído.
  await prisma.conversationParticipant.updateMany({
    where: { conversationId: id, userId: session.userId },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json(serializeMessage(message), { status: 201 })
}
