'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Conversation, User, Message, Attachment, ReferenceLink } from '@/types'
import { cn } from '@/lib/utils'
import { isSameDay } from '@/lib/dates'
import { useChatStore } from '@/store/useChatStore'
import { useUserStore } from '@/store/useUserStore'
import { MessageBubble } from './MessageBubble'

interface Props {
  conversation: Conversation | null
  currentUser: User
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[var(--tp-border)]" />
      <span className="text-[11px] text-[var(--tp-text-2)] font-medium px-1 capitalize">{label}</span>
      <div className="flex-1 h-px bg-[var(--tp-border)]" />
    </div>
  )
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(d, today)) return 'Hoy'
  if (isSameDay(d, yesterday)) return 'Ayer'
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

function AttachmentPreviewPill({
  name,
  onRemove,
}: {
  name: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--tp-bg-2)] border border-[var(--tp-border)] rounded-full text-xs font-medium text-[var(--tp-text)]">
      <span>📎</span>
      <span className="max-w-[120px] truncate">{name}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 text-[var(--tp-text-2)] hover:text-red-500 transition-colors"
      >
        ×
      </button>
    </span>
  )
}

function LinkPreviewPill({
  title,
  url,
  onRemove,
}: {
  title: string
  url: string
  onRemove: () => void
}) {
  let domain = url
  try { domain = new URL(url).hostname.replace('www.', '') } catch {}
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--tp-bg-2)] border border-[var(--tp-border)] rounded-full text-xs font-medium text-[var(--tp-text)]">
      <span>🔗</span>
      <span className="max-w-[120px] truncate">{title || domain}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 text-[var(--tp-text-2)] hover:text-red-500 transition-colors"
      >
        ×
      </button>
    </span>
  )
}

export function ChatWindow({ conversation, currentUser }: Props) {
  const [input, setInput] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [pendingLinks, setPendingLinks] = useState<ReferenceLink[]>([])
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const allMessages = useChatStore((s) => s.messages)
  const addMessage = useChatStore((s) => s.addMessage)
  const updateConversation = useChatStore((s) => s.updateConversation)
  const users = useUserStore((s) => s.users)

  const messages = conversation
    ? allMessages.filter((m) => m.conversationId === conversation.id)
    : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, conversation?.id])

  useEffect(() => {
    if (conversation) {
      setNameInput(conversation.name)
    }
  }, [conversation?.id])

  function getUserById(id: string): User | undefined {
    return users.find((u) => u.id === id)
  }

  function handleSend() {
    if (!conversation) return
    if (!input.trim() && pendingAttachments.length === 0 && pendingLinks.length === 0) return

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: conversation.id,
      senderId: currentUser.id,
      text: input.trim(),
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      links: pendingLinks.length > 0 ? pendingLinks : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addMessage(newMsg)
    setInput('')
    setPendingAttachments([])
    setPendingLinks([])
    setShowLinkForm(false)
    setLinkUrl('')
    setLinkTitle('')

    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-grow
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const allowed = ['image/', 'application/pdf', 'application/zip', 'application/msword',
      'application/vnd.openxmlformats', 'text/']
    const maxBytes = 10 * 1024 * 1024

    files.forEach((file) => {
      const isAllowed = allowed.some((t) => file.type.startsWith(t))
      if (!isAllowed) return
      if (file.size > maxBytes) return

      const reader = new FileReader()
      reader.onload = () => {
        const att: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
          uploadedBy: currentUser.id,
          uploadedAt: new Date().toISOString(),
        }
        setPendingAttachments((prev) => [...prev, att])
      }
      reader.readAsDataURL(file)
    })

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleAddLink() {
    if (!linkUrl.trim()) return
    let cleanUrl = linkUrl.trim()
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl

    const link: ReferenceLink = {
      id: `link-${Date.now()}`,
      title: linkTitle.trim() || cleanUrl,
      url: cleanUrl,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    }
    setPendingLinks((prev) => [...prev, link])
    setLinkUrl('')
    setLinkTitle('')
    setShowLinkForm(false)
  }

  function handleSaveName() {
    if (!conversation || !nameInput.trim()) return
    updateConversation(conversation.id, { name: nameInput.trim() })
    setEditingName(false)
  }

  // Group messages by day
  const groupedMessages: { label: string; messages: Message[] }[] = []
  messages.forEach((msg) => {
    const label = getDayLabel(msg.createdAt)
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.label === label) {
      last.messages.push(msg)
    } else {
      groupedMessages.push({ label, messages: [msg] })
    }
  })

  const memberCount = conversation?.members.length ?? 0
  const isGroup = conversation?.type === 'group'

  // ── Empty state ──────────────────────────────────────────
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[var(--tp-bg)]">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="w-20 h-20 rounded-[var(--tp-r-inner)] bg-[var(--tp-bg-2)] flex items-center justify-center border border-[var(--tp-border)]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--tp-text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-[var(--tp-text-2)] text-sm leading-relaxed">
            Selecciona una conversación o crea una nueva para empezar.
          </p>
        </div>
      </div>
    )
  }

  // ── Chat ──────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--tp-border)] bg-[var(--tp-surface)] flex-shrink-0">
        {/* Avatar / cover */}
        {conversation.coverImageUrl ? (
          <img
            src={conversation.coverImageUrl}
            alt={conversation.name}
            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
          />
        ) : isGroup ? (
          <div className="w-9 h-9 rounded-xl bg-[var(--tp-lime)] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[var(--tp-dark)]">
              {conversation.name.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          (() => {
            const otherId = conversation.members.find((m) => m !== currentUser.id)
            const other = users.find((u) => u.id === otherId)
            return other?.avatarUrl ? (
              <img src={other.avatarUrl} alt={other.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white text-xs uppercase', other?.color ?? 'bg-gray-400')}>
                {other?.initials ?? '?'}
              </div>
            )
          })()
        )}

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editingName && isGroup ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSaveName() }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="text-sm font-semibold bg-transparent border-b-2 border-[var(--tp-lime)] outline-none text-[var(--tp-text)] w-full max-w-[200px]"
                onBlur={handleSaveName}
              />
            </form>
          ) : (
            <h3 className="font-semibold text-[var(--tp-text)] text-sm truncate">{conversation.name}</h3>
          )}
          <p className="text-[11px] text-[var(--tp-text-2)]">
            {isGroup ? `${memberCount} miembros` : 'Mensaje directo'}
          </p>
        </div>

        {/* Edit name button for groups */}
        {isGroup && (
          <button
            onClick={() => { setEditingName(true); setNameInput(conversation.name) }}
            title="Editar nombre del grupo"
            className="p-1.5 rounded-lg hover:bg-[var(--tp-bg-2)] text-[var(--tp-text-2)] hover:text-[var(--tp-text)] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-[var(--tp-bg)]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--tp-text-2)]">
            <div className="text-3xl">💬</div>
            <p className="text-sm">Sé el primero en escribir algo</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.label}>
              <DateDivider label={group.label} />
              {group.messages.map((msg) => {
                const sender = getUserById(msg.senderId)
                const isOwn = msg.senderId === currentUser.id
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={isOwn}
                    senderName={sender?.name ?? msg.senderId}
                    senderInitials={sender?.initials ?? msg.senderId.charAt(0).toUpperCase()}
                    senderColor={sender?.color ?? 'bg-gray-400'}
                    senderAvatar={sender?.avatarUrl}
                    showSender={isGroup}
                  />
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending attachments / links preview */}
      {(pendingAttachments.length > 0 || pendingLinks.length > 0) && (
        <div className="px-4 py-2 border-t border-[var(--tp-border)] bg-[var(--tp-surface)] flex flex-wrap gap-2">
          {pendingAttachments.map((att, i) => (
            <AttachmentPreviewPill
              key={att.id}
              name={att.name}
              onRemove={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
          {pendingLinks.map((link, i) => (
            <LinkPreviewPill
              key={link.id}
              title={link.title}
              url={link.url}
              onRemove={() => setPendingLinks((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      {/* Link form */}
      {showLinkForm && (
        <div className="px-4 py-3 border-t border-[var(--tp-border)] bg-[var(--tp-surface)] flex items-end gap-2">
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              autoFocus
              type="url"
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink() } }}
              className="w-full px-3 py-2 text-sm bg-[var(--tp-bg)] border border-[var(--tp-border)] rounded-[var(--tp-r-input)] outline-none focus:ring-2 focus:ring-[var(--tp-lime)] text-[var(--tp-text)] placeholder:text-[var(--tp-text-2)]"
            />
            <input
              type="text"
              placeholder="Título (opcional)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink() } }}
              className="w-full px-3 py-2 text-sm bg-[var(--tp-bg)] border border-[var(--tp-border)] rounded-[var(--tp-r-input)] outline-none focus:ring-2 focus:ring-[var(--tp-lime)] text-[var(--tp-text)] placeholder:text-[var(--tp-text-2)]"
            />
          </div>
          <button
            onClick={handleAddLink}
            className="px-3 py-2 bg-[var(--tp-dark)] text-white rounded-[var(--tp-r-input)] text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Agregar
          </button>
          <button
            onClick={() => { setShowLinkForm(false); setLinkUrl(''); setLinkTitle('') }}
            className="px-3 py-2 text-[var(--tp-text-2)] hover:text-[var(--tp-text)] text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-[var(--tp-border)] bg-[var(--tp-surface)] flex-shrink-0">
        <div className="flex items-end gap-2 bg-[var(--tp-bg)] rounded-[var(--tp-r-inner)] px-3 py-2 border border-[var(--tp-border)]">
          {/* File button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar archivo"
            className="p-1.5 rounded-lg text-[var(--tp-text-2)] hover:text-[var(--tp-text)] hover:bg-[var(--tp-bg-2)] transition-colors flex-shrink-0"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.zip,.doc,.docx,.txt,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Link button */}
          <button
            type="button"
            onClick={() => setShowLinkForm((v) => !v)}
            title="Agregar enlace"
            className={cn(
              'p-1.5 rounded-lg transition-colors flex-shrink-0',
              showLinkForm
                ? 'text-[var(--tp-dark)] bg-[var(--tp-lime)]'
                : 'text-[var(--tp-text-2)] hover:text-[var(--tp-text)] hover:bg-[var(--tp-bg-2)]'
            )}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
            className="flex-1 resize-none bg-transparent text-sm text-[var(--tp-text)] placeholder:text-[var(--tp-text-2)] outline-none py-1 min-h-[28px] max-h-[120px] leading-relaxed"
            style={{ overflowY: 'auto' }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() && pendingAttachments.length === 0 && pendingLinks.length === 0}
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
              input.trim() || pendingAttachments.length > 0 || pendingLinks.length > 0
                ? 'bg-[var(--tp-lime)] text-[var(--tp-dark)] hover:opacity-90'
                : 'bg-[var(--tp-bg-2)] text-[var(--tp-text-2)] cursor-not-allowed'
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
