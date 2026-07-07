import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { serializeConversation } from '@/lib/chat'

const PARTICIPANT_INCLUDE = { participants: { include: { user: { select: { name: true } } } } } as const

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const conversations = await prisma.conversation.findMany({
    where: {
      companyId: session.activeCompanyId,
      participants: { some: { userId: session.userId } },
    },
    include: PARTICIPANT_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  })

  const serialized = await Promise.all(conversations.map((c) => serializeConversation(c, session.userId)))
  return NextResponse.json(serialized)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { type, name, memberIds, coverImageUrl } = await req.json()
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos una persona' }, { status: 400 })
  }

  const validMembers = await prisma.companyMembership.findMany({
    where: { companyId: session.activeCompanyId, userId: { in: memberIds } },
    select: { userId: true },
  })
  const participantIds = Array.from(new Set([session.userId, ...validMembers.map((m) => m.userId)]))
  const isGroup = type === 'group'

  if (!isGroup && participantIds.length !== 2) {
    return NextResponse.json({ error: 'Una conversación directa necesita exactamente 2 personas' }, { status: 400 })
  }
  if (isGroup && !name?.trim()) {
    return NextResponse.json({ error: 'El grupo necesita un nombre' }, { status: 400 })
  }

  // Find-or-create para directos: evita duplicar la misma conversación 1-a-1.
  if (!isGroup) {
    const existing = await prisma.conversation.findFirst({
      where: {
        companyId: session.activeCompanyId,
        type: 'direct',
        AND: participantIds.map((userId) => ({ participants: { some: { userId } } })),
      },
      include: PARTICIPANT_INCLUDE,
    })
    if (existing && existing.participants.length === 2) {
      return NextResponse.json(await serializeConversation(existing, session.userId))
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      companyId: session.activeCompanyId,
      type: isGroup ? 'group' : 'direct',
      name: isGroup ? name.trim() : null,
      coverImageUrl: isGroup ? coverImageUrl : null,
      createdBy: session.userId,
      participants: { createMany: { data: participantIds.map((userId) => ({ userId })) } },
    },
    include: PARTICIPANT_INCLUDE,
  })

  return NextResponse.json(await serializeConversation(conversation, session.userId), { status: 201 })
}
