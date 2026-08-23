'use client'

import { useState } from 'react'
import { Eye, Download } from 'lucide-react'
import { Message, Attachment } from '@/types'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/dates'
import { AttachmentViewer } from './AttachmentViewer'

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

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentView({
  attachment,
  isOwn,
  onView,
}: {
  attachment: Attachment
  isOwn: boolean
  onView: () => void
}) {
  const isImage = attachment.type?.startsWith('image/')

  if (isImage) {
    return (
      <button
        type="button"
        onClick={onView}
        title="Ver"
        className="group/att relative block rounded-xl overflow-hidden border border-black/10 max-w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-w-full max-h-56 object-cover"
        />
        {/* Overlay con ojito al pasar el cursor */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/att:bg-black/30 transition-colors">
          <span className="opacity-0 group-hover/att:opacity-100 transition-opacity w-9 h-9 rounded-full bg-black/55 flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </span>
        </span>
      </button>
    )
  }

  const iconBtn = cn(
    'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
    isOwn ? 'hover:bg-white/20' : 'hover:bg-black/10'
  )

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium max-w-[260px]',
        isOwn ? 'bg-white/15 text-white' : 'bg-black/[0.06] text-[var(--tp-text)]'
      )}
    >
      <span className="text-base leading-none">📎</span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="truncate">{attachment.name}</span>
        {attachment.size > 0 && (
          <span className={cn('text-[10px]', isOwn ? 'text-white/60' : 'text-[var(--tp-text-2)]')}>
            {formatSize(attachment.size)}
          </span>
        )}
      </span>
      <button type="button" onClick={onView} title="Ver" className={iconBtn}>
        <Eye className="w-3.5 h-3.5" />
      </button>
      <a
        href={attachment.url}
        download={attachment.name}
        target="_blank"
        rel="noopener noreferrer"
        title="Descargar"
        className={iconBtn}
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
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
  const [viewerAtt, setViewerAtt] = useState<Attachment | null>(null)
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
            <div className="flex flex-col gap-1.5 mt-2">
              {message.attachments!.map((att) => (
                <AttachmentView key={att.id} attachment={att} isOwn={isOwn} onView={() => setViewerAtt(att)} />
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

      <AttachmentViewer attachment={viewerAtt} onClose={() => setViewerAtt(null)} />
    </div>
  )
}
