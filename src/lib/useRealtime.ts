'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Message } from '@/types'
import { notifyChat } from '@/lib/notify'
import { useAuthStore } from '@/store/useAuthStore'
import { useChatStore } from '@/store/useChatStore'
import { useUserStore } from '@/store/useUserStore'

type Router = ReturnType<typeof useRouter>

// Suscripción global a eventos en tiempo real vía SSE (/api/events/stream).
// Entrega mensajes nuevos al store al instante y muestra un toast cuando llega
// un mensaje de otra persona en una conversación que no estás viendo.
// El sondeo de ClientShell/ChatWindow queda como red de seguridad si SSE cae.
export function useRealtime() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn) return
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    const es = new EventSource('/api/events/stream')

    const onMessage = (e: MessageEvent) => {
      let event: { message: Message }
      try {
        event = JSON.parse(e.data)
      } catch {
        return
      }
      if (event?.message) handleIncomingMessage(event.message, router)
    }

    es.addEventListener('message', onMessage as EventListener)
    // No cerramos en onerror: EventSource se reconecta solo.

    return () => {
      es.removeEventListener('message', onMessage as EventListener)
      es.close()
    }
  }, [isLoggedIn, router])
}

function handleIncomingMessage(message: Message, router: Router) {
  const chat = useChatStore.getState()
  const currentUserId = useAuthStore.getState().user?.id
  const isOwn = message.senderId === currentUserId
  const isActive = chat.activeConversationId === message.conversationId

  // Conversación que aún no tenemos en la lista (p. ej. recién creada por otra
  // persona): re-sincroniza para que aparezca.
  if (!chat.conversations.some((c) => c.id === message.conversationId)) {
    chat.fetchConversations()
  }

  chat.receiveMessage(message, { incrementUnread: !isOwn && !isActive })

  if (isOwn) return

  if (isActive) {
    // Ya la estás viendo: márcala leída también en el servidor.
    chat.markRead(message.conversationId)
    return
  }

  const sender = useUserStore.getState().users.find((u) => u.id === message.senderId)
  notifyChat(sender?.name ?? 'Nuevo mensaje', {
    description: message.text || '📎 Te enviaron un adjunto',
    action: {
      label: 'Abrir',
      onClick: () => router.push(`/chats?c=${message.conversationId}`),
    },
  })
}
