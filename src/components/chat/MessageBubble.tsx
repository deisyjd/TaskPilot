'use client'

import { Message } from '@/types'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/dates'

interface Props {
  message: Message
  isOwn: boolean
  senderName: string
  senderInitials: string
  senderColor: string
  senderAvatar?: string
  showSender?: boolean
}

function Avatar({
  initials,
  color,
  avatarUrl,
  size = 32,
}: {
  initials: string
  color: string
  avatarUrl?: string
  size?: number
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={initials}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white uppercase',
        color
      )}
    >
      {initials}
    </div>
  )
}

function AttachmentPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/10 text-xs font-medium truncate max-w-[200px]">
      <span>📎</span>
      <span className="truncate">{name}</span>
    </span>
  )
}

function LinkPill({ url, title }: { url: string; title?: string }) {
  let domain = url
  try {
    domain = new URL(url).hostname.replace('www.', '')
  } catch {}

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/10 text-xs font-medium hover:bg-black/20 transition-colors truncate max-w-[220px]"
    >
      <span>🔗</span>
      <span className="truncate">{title || domain}</span>
    </a>
  )
}

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderInitials,
  senderColor,
  senderAvatar,
  showSender = false,
}: Props) {
  const hasAttachments = message.attachments && message.attachments.length > 0
  const hasLinks = message.links && message.links.length > 0

  return (
    <div
      className={cn(
        'flex items-end gap-2.5 mb-3',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar — only for others */}
      {!isOwn && (
        <div className="flex-shrink-0 mb-0.5">
          <Avatar
            initials={senderInitials}
            color={senderColor}
            avatarUrl={senderAvatar}
            size={30}
          />
        </div>
      )}

      {/* Bubble column */}
      <div className={cn('flex flex-col max-w-[68%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender name (group chats only) */}
        {showSender && !isOwn && (
          <span className="text-[11px] font-semibold text-[var(--tp-text-2)] mb-1 ml-1">
            {senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-2.5 text-sm leading-relaxed',
            isOwn
              ? 'bg-[var(--tp-dark)] text-white rounded-[18px] rounded-br-[4px]'
              : 'bg-white text-[var(--tp-text)] rounded-[18px] rounded-bl-[4px] shadow-sm border border-[var(--tp-border)]'
          )}
          style={{ wordBreak: 'break-word' }}
        >
          {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}

          {/* Attachments */}
          {hasAttachments && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {message.attachments!.map((att) => (
                <AttachmentPill key={att.id} name={att.name} />
              ))}
            </div>
          )}

          {/* Links */}
          {hasLinks && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {message.links!.map((link) => (
                <LinkPill key={link.id} url={link.url} title={link.title} />
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-[var(--tp-text-2)] mt-1 px-1">
          {formatDateTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}
