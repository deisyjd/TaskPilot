import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Conversation, Message, Attachment, ReferenceLink } from '@/types'
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '@/data/chats'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

interface ChatStore {
  conversations: Conversation[]
  messages: Message[]
  addConversation: (conv: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  deleteConversation: (id: string) => void
  addMessage: (msg: Message) => void
  getMessages: (conversationId: string) => Message[]
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: MOCK_CONVERSATIONS,
      messages: MOCK_MESSAGES,

      addConversation: (conv) =>
        set((s) => ({
          conversations: [conv, ...s.conversations],
        })),

      updateConversation: (id, updates) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          messages: s.messages.filter((m) => m.conversationId !== id),
        })),

      addMessage: (msg) =>
        set((s) => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map((c) =>
            c.id === msg.conversationId
              ? { ...c, lastMessageAt: msg.createdAt, updatedAt: msg.createdAt }
              : c
          ),
        })),

      getMessages: (conversationId) =>
        get().messages.filter((m) => m.conversationId === conversationId),
    }),
    {
      name: 'wipli-chats',
      version: 2,
      skipHydration: true,
      migrate: () => ({ conversations: MOCK_CONVERSATIONS, messages: MOCK_MESSAGES }),
    }
  )
)
