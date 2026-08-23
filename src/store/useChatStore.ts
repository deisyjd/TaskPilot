import { create } from 'zustand'
import { Conversation, Message } from '@/types'

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Solicitud fallida (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function messagePreview(m: Message): string {
  if (m.text) return m.text
  if (m.attachments?.length) return `📎 ${m.attachments[0].name}`
  if (m.links?.length) return `🔗 ${m.links[0].title || m.links[0].url}`
  return ''
}

interface ChatStore {
  conversations: Conversation[]
  messages: Message[]
  conversationsLoading: boolean
  messagesLoading: boolean
  error: string | null
  // Conversación abierta ahora mismo (para no marcar como no leído ni notificar
  // los mensajes que ya se están viendo). La setea ChatWindow.
  activeConversationId: string | null

  fetchConversations: () => Promise<void>
  setActiveConversation: (id: string | null) => void
  receiveMessage: (message: Message, opts: { incrementUnread: boolean }) => void
  fetchMessages: (conversationId: string) => Promise<void>
  createConversation: (payload: {
    type: 'direct' | 'group'
    name?: string
    memberIds: string[]
    coverImageUrl?: string
  }) => Promise<Conversation | null>
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>
  addMessage: (payload: {
    conversationId: string
    text: string
    attachments?: Message['attachments']
    links?: Message['links']
  }) => Promise<Message | null>
  markRead: (conversationId: string) => Promise<void>
  getMessages: (conversationId: string) => Message[]
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  conversations: [],
  messages: [],
  conversationsLoading: false,
  messagesLoading: false,
  error: null,
  activeConversationId: null,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  // Mensaje entrante por SSE. Idempotente (dedupe por id): actualiza la lista de
  // mensajes y refresca lastMessage/preview/no-leídos de la conversación.
  receiveMessage: (message, { incrementUnread }) =>
    set((s) => {
      if (s.messages.some((m) => m.id === message.id)) return s
      return {
        messages: [...s.messages, message],
        conversations: s.conversations.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessageAt: message.createdAt,
                updatedAt: message.createdAt,
                lastMessagePreview: messagePreview(message),
                unreadCount: incrementUnread ? (c.unreadCount ?? 0) + 1 : (c.unreadCount ?? 0),
              }
            : c
        ),
      }
    }),

  fetchConversations: async () => {
    set({ conversationsLoading: true, error: null })
    try {
      const conversations = await api<Conversation[]>('/api/conversations')
      set({ conversations })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al cargar conversaciones' })
    } finally {
      set({ conversationsLoading: false })
    }
  },

  fetchMessages: async (conversationId) => {
    set({ messagesLoading: true, error: null })
    try {
      const msgs = await api<Message[]>(`/api/conversations/${conversationId}/messages`)
      set((s) => ({
        messages: [...s.messages.filter((m) => m.conversationId !== conversationId), ...msgs],
      }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al cargar mensajes' })
    } finally {
      set({ messagesLoading: false })
    }
  },

  createConversation: async (payload) => {
    try {
      const created = await api<Conversation>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      set((s) => {
        const exists = s.conversations.some((c) => c.id === created.id)
        return {
          conversations: exists
            ? s.conversations.map((c) => (c.id === created.id ? created : c))
            : [created, ...s.conversations],
        }
      })
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al crear la conversación' })
      return null
    }
  },

  updateConversation: async (id, updates) => {
    try {
      const updated = await api<Conversation>(`/api/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? updated : c)) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al actualizar la conversación' })
    }
  },

  addMessage: async ({ conversationId, text, attachments, links }) => {
    try {
      const created = await api<Message>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text, attachments, links }),
      })
      set((s) => ({
        messages: [...s.messages, created],
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessageAt: created.createdAt, updatedAt: created.createdAt, unreadCount: 0 }
            : c
        ),
      }))
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al enviar el mensaje' })
      return null
    }
  },

  markRead: async (conversationId) => {
    try {
      await api(`/api/conversations/${conversationId}/read`, { method: 'POST' })
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      }))
    } catch {
      // No leído es best-effort — no bloquea la UI si falla.
    }
  },

  getMessages: (conversationId) => get().messages.filter((m) => m.conversationId === conversationId),
}))
