import { prisma } from '@/lib/prisma'

type ConversationWithParticipants = {
  id: string
  companyId: string
  name: string | null
  type: string
  coverImageUrl: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  participants: { userId: string; lastReadAt: Date | null; user: { name: string } }[]
}

export async function findParticipantConversation(conversationId: string, userId: string, companyId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, companyId },
    include: { participants: { select: { userId: true } } },
  })
  if (!conversation) return null
  if (!conversation.participants.some((p) => p.userId === userId)) return null
  return conversation
}

export function serializeMessage(message: {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachments: unknown
  links: unknown
  createdAt: Date
}) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    text: message.content,
    attachments: message.attachments ?? undefined,
    links: message.links ?? undefined,
    createdAt: message.createdAt,
    updatedAt: message.createdAt,
  }
}

function buildPreview(message: { content: string; attachments: unknown; links: unknown } | null): string {
  if (!message) return ''
  if (message.content) return message.content
  const attachments = message.attachments as { name: string }[] | null
  if (attachments?.length) return `📎 ${attachments[0].name}`
  const links = message.links as { title?: string; url: string }[] | null
  if (links?.length) return `🔗 ${links[0].title || links[0].url}`
  return ''
}

export async function serializeConversation(conversation: ConversationWithParticipants, userId: string) {
  const me = conversation.participants.find((p) => p.userId === userId)

  const [lastMessage, unreadCount] = await Promise.all([
    prisma.message.findFirst({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' } }),
    prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        createdAt: { gt: me?.lastReadAt ?? new Date(0) },
      },
    }),
  ])

  // Directos: el nombre mostrado siempre es el del otro participante,
  // resuelto en vivo (evita que quede desactualizado si esa persona
  // cambia su nombre después de crear la conversación).
  const other = conversation.participants.find((p) => p.userId !== userId)
  const name = conversation.type === 'group' ? (conversation.name ?? '') : (other?.user.name ?? conversation.name ?? '')

  return {
    id: conversation.id,
    type: conversation.type,
    name,
    coverImageUrl: conversation.coverImageUrl ?? undefined,
    members: conversation.participants.map((p) => p.userId),
    createdBy: conversation.createdBy ?? '',
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessageAt: lastMessage?.createdAt ?? null,
    lastMessagePreview: buildPreview(lastMessage),
    unreadCount,
  }
}
