'use client'

import { useState } from 'react'
import { useChatStore } from '@/store/useChatStore'
import { useCurrentUser } from '@/store/useUserStore'
import { ChatList } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { CreateConversationModal } from '@/components/chat/CreateConversationModal'

export default function ChatsPage() {
  const conversations = useChatStore((s) => s.conversations)
  const currentUser = useCurrentUser()

  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null)
  const [createOpen, setCreateOpen] = useState(false)

  // Keep activeId in sync if the active conversation is deleted
  const activeConversation = conversations.find((c) => c.id === activeId) ?? null

  function handleSelect(id: string) {
    setActiveId(id)
  }

  function handleNew() {
    setCreateOpen(true)
  }

  if (!currentUser) return null

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-[var(--tp-r-card)] border border-[var(--tp-border)] shadow-sm bg-[var(--tp-surface)]">
      {/* Left sidebar — conversation list. En mobile se muestra solo cuando no
          hay una conversación abierta. */}
      <div
        className={`w-full md:w-[280px] flex-shrink-0 border-r border-[var(--tp-border)] bg-[var(--tp-surface)] overflow-hidden flex-col ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        <ChatList
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
        />
      </div>

      {/* Main chat area — en mobile se muestra solo cuando hay conversación. */}
      <div className={`flex-1 overflow-hidden ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
        <ChatWindow
          conversation={activeConversation}
          currentUser={currentUser}
          onBack={() => setActiveId(null)}
        />
      </div>

      {/* Create conversation modal */}
      <CreateConversationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
