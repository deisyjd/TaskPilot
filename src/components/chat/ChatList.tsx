'use client'

import { useState } from 'react'
import { Conversation } from '@/types'
import { cn } from '@/lib/utils'
import { useUserStore, useCurrentUser } from '@/store/useUserStore'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

function isRecent(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const then = new Date(dateStr).getTime()
  const now = Date.now()
  return now - then < 24 * 60 * 60 * 1000
}

function ConvAvatar({
  conv,
  users,
  currentUserId,
}: {
  conv: Conversation
  users: { id: string; name: string; initials: string; color: string; avatarUrl?: string }[]
  currentUserId: string
}) {
  if (conv.type === 'group') {
    const letter = conv.name.charAt(0).toUpperCase()
    return (
      <div className="w-9 h-9 rounded-xl bg-[var(--tp-lime)] flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-[var(--tp-dark)]">{letter}</span>
      </div>
    )
  }

  // Direct: show the other user's avatar
  const otherId = conv.members.find((m) => m !== currentUserId) ?? conv.members[0]
  const other = users.find((u) => u.id === otherId)

  if (!other) {
    return (
      <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-white">?</span>
      </div>
    )
  }

  if (other.avatarUrl) {
    return (
      <img
        src={other.avatarUrl}
        alt={other.name}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    )
  }

  return (
    <div
      className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white text-xs uppercase',
        other.color
      )}
    >
      {other.initials}
    </div>
  )
}

export function ChatList({ conversations, activeId, onSelect, onNew }: Props) {
  const [search, setSearch] = useState('')
  const users = useUserStore((s) => s.users)
  const currentUser = useCurrentUser()

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function getLastMessagePreview(conv: Conversation): string {
    const preview = conv.lastMessagePreview
    if (!preview) return 'Sin mensajes aún'
    return preview.length > 50 ? preview.slice(0, 50) + '…' : preview
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--tp-text)] text-base">Chats</h2>
          <button
            onClick={onNew}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--tp-dark)] text-white text-xs font-medium hover:opacity-80 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tp-text-2)]"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar conversación…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--tp-bg-2)] border border-[var(--tp-border)] rounded-[var(--tp-r-input)] text-[var(--tp-text)] placeholder:text-[var(--tp-text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--tp-lime)] transition"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--tp-text-2)] text-sm px-4">
            {search ? 'Sin resultados para tu búsqueda' : 'No hay conversaciones todavía'}
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeId
            const recent = isRecent(conv.lastMessageAt)
            const preview = getLastMessagePreview(conv)
            const timeLabel = conv.lastMessageAt
              ? new Date(conv.lastMessageAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--tp-r-inner)] text-left transition-all group',
                  isActive
                    ? 'bg-[var(--tp-bg-2)] border-l-[3px] border-[var(--tp-lime)] pl-[calc(0.75rem-3px)]'
                    : 'hover:bg-[var(--tp-bg-2)] border-l-[3px] border-transparent'
                )}
              >
                <ConvAvatar conv={conv} users={users} currentUserId={currentUser?.id ?? ''} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={cn(
                        'text-sm font-semibold truncate',
                        isActive ? 'text-[var(--tp-text)]' : 'text-[var(--tp-text)]'
                      )}
                    >
                      {conv.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {timeLabel && (
                        <span className="text-[10px] text-[var(--tp-text-2)]">{timeLabel}</span>
                      )}
                      {recent && (
                        <span className="w-2 h-2 rounded-full bg-[var(--tp-lime)] flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--tp-text-2)] truncate leading-snug">{preview}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
