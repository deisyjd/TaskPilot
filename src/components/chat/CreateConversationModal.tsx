'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useChatStore } from '@/store/useChatStore'
import { useCurrentUser, useUserStore } from '@/store/useUserStore'
import { cn } from '@/lib/utils'
import { Conversation } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

type ChatType = 'direct' | 'group'

function UserAvatar({
  initials,
  color,
  avatarUrl,
  size = 36,
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

export function CreateConversationModal({ open, onClose }: Props) {
  const currentUser = useCurrentUser()
  const addConversation = useChatStore((s) => s.addConversation)
  const allUsers = useUserStore((s) => s.users)

  const [type, setType] = useState<ChatType>('direct')
  const [selectedDirectUser, setSelectedDirectUser] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupCoverBase64, setGroupCoverBase64] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [error, setError] = useState('')

  const otherUsers = allUsers.filter((u) => u.id !== currentUser?.id && u.status !== 'inactive')

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setGroupCoverBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  function handleReset() {
    setType('direct')
    setSelectedDirectUser(null)
    setGroupName('')
    setGroupCoverBase64(null)
    setSelectedMembers([])
    setError('')
  }

  function handleClose() {
    handleReset()
    onClose()
  }

  function handleSave() {
    setError('')
    if (!currentUser) return

    if (type === 'direct') {
      if (!selectedDirectUser) {
        setError('Selecciona un usuario para el chat directo.')
        return
      }
      const targetUser = otherUsers.find((u) => u.id === selectedDirectUser)!
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        type: 'direct',
        name: targetUser.name,
        members: [currentUser.id, selectedDirectUser],
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addConversation(newConv)
    } else {
      if (!groupName.trim()) {
        setError('El nombre del grupo es obligatorio.')
        return
      }
      if (selectedMembers.length === 0) {
        setError('Agrega al menos un miembro al grupo.')
        return
      }
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        type: 'group',
        name: groupName.trim(),
        coverImageUrl: groupCoverBase64 ?? undefined,
        members: [currentUser.id, ...selectedMembers],
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addConversation(newConv)
    }

    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md w-full rounded-[var(--tp-r-card)] p-0 overflow-hidden border border-[var(--tp-border)] shadow-lg bg-[var(--tp-surface)]">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-semibold text-[var(--tp-text)]">
            Nueva conversación
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-5 pb-6 space-y-5">
          {/* Type toggle */}
          <div className="flex gap-1 p-1 bg-[var(--tp-bg-2)] rounded-full w-fit">
            {(['direct', 'group'] as ChatType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setError('') }}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                  type === t
                    ? 'bg-[var(--tp-dark)] text-white shadow-sm'
                    : 'text-[var(--tp-text-2)] hover:text-[var(--tp-text)]'
                )}
              >
                {t === 'direct' ? 'Directo' : 'Grupal'}
              </button>
            ))}
          </div>

          {/* Direct: user picker */}
          {type === 'direct' && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--tp-text-2)] uppercase tracking-wide">Selecciona un usuario</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {otherUsers.map((user) => {
                  const selected = selectedDirectUser === user.id
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedDirectUser(user.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--tp-r-input)] border text-left transition-all',
                        selected
                          ? 'border-[var(--tp-dark)] bg-[var(--tp-dark)] text-white'
                          : 'border-[var(--tp-border)] hover:bg-[var(--tp-bg-2)] text-[var(--tp-text)]'
                      )}
                    >
                      <UserAvatar
                        initials={user.initials}
                        color={user.color}
                        avatarUrl={user.avatarUrl}
                        size={34}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', selected ? 'text-white' : 'text-[var(--tp-text)]')}>
                          {user.name}
                        </p>
                        <p className={cn('text-xs truncate', selected ? 'text-white/70' : 'text-[var(--tp-text-2)]')}>
                          {user.role}
                        </p>
                      </div>
                      {selected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[var(--tp-lime)]">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Group form */}
          {type === 'group' && (
            <div className="space-y-4">
              {/* Group name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--tp-text-2)] uppercase tracking-wide">
                  Nombre del grupo *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej. Proyecto X, Equipo Diseño…"
                  className="w-full px-3 py-2.5 text-sm border border-[var(--tp-border)] rounded-[var(--tp-r-input)] bg-[var(--tp-bg)] text-[var(--tp-text)] placeholder:text-[var(--tp-text-2)] focus:outline-none focus:ring-2 focus:ring-[var(--tp-lime)] transition"
                />
              </div>

              {/* Cover image */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--tp-text-2)] uppercase tracking-wide">
                  Imagen de portada (opcional)
                </label>
                <div className="flex items-center gap-3">
                  {groupCoverBase64 ? (
                    <img
                      src={groupCoverBase64}
                      alt="Portada"
                      className="w-12 h-12 rounded-xl object-cover border border-[var(--tp-border)]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[var(--tp-bg-2)] border border-dashed border-[var(--tp-border)] flex items-center justify-center text-[var(--tp-text-2)]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-[var(--tp-bg-2)] border border-[var(--tp-border)] rounded-full hover:bg-[var(--tp-border)] transition-colors text-[var(--tp-text)]">
                    {groupCoverBase64 ? 'Cambiar' : 'Subir imagen'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverChange}
                    />
                  </label>
                  {groupCoverBase64 && (
                    <button
                      onClick={() => setGroupCoverBase64(null)}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--tp-text-2)] uppercase tracking-wide">
                  Miembros * ({selectedMembers.length} seleccionados)
                </p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {otherUsers.map((user) => {
                    const checked = selectedMembers.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-[var(--tp-r-input)] border text-left transition-all',
                          checked
                            ? 'border-[var(--tp-lime)] bg-[var(--tp-lime)]/10'
                            : 'border-[var(--tp-border)] hover:bg-[var(--tp-bg-2)]'
                        )}
                      >
                        <UserAvatar
                          initials={user.initials}
                          color={user.color}
                          avatarUrl={user.avatarUrl}
                          size={30}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--tp-text)] truncate">{user.name}</p>
                          <p className="text-xs text-[var(--tp-text-2)] truncate">{user.role}</p>
                        </div>
                        {/* Checkbox */}
                        <div className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          checked
                            ? 'bg-[var(--tp-dark)] border-[var(--tp-dark)]'
                            : 'border-[var(--tp-border)]'
                        )}>
                          {checked && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-[var(--tp-text-2)] hover:text-[var(--tp-text)] transition-colors rounded-full"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold bg-[var(--tp-dark)] text-white rounded-full hover:opacity-80 transition-opacity"
            >
              Crear chat
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
