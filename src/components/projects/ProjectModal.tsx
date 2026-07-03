'use client'

import { useState, useEffect } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useCurrentUser, useUserStore } from '@/store/useUserStore'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Project } from '@/types'
import { FolderPlus } from 'lucide-react'
import { ImageUploader } from '@/components/shared/ImageUploader'

const PRESET_COLORS = [
  '#6366f1', '#0ea5e9', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#22c55e',
  '#f97316', '#06b6d4', '#a855f7', '#84cc16', '#DFFF5F',
]

interface Props {
  open: boolean
  project?: Project | null   // null/undefined = create mode, Project = edit mode (future)
  onClose: () => void
  onSave?: (project: Project) => void  // optional callback; if omitted, calls addProject directly
}

export function ProjectModal({ open, project: existingProject, onClose, onSave }: Props) {
  const addProject = useTaskStore((s) => s.addProject)
  const updateProject = useTaskStore((s) => s.updateProject)
  const currentUser = useCurrentUser()
  const users = useUserStore((s) => s.users)

  // ─── Form state ────────────────────────────────────────────
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const isEditMode = Boolean(existingProject)

  // Populate fields when editing
  useEffect(() => {
    if (existingProject) {
      setName(existingProject.name)
      setColor(existingProject.color)
      setDescription(existingProject.description ?? '')
      setStatus(existingProject.status ?? 'active')
      setSelectedMembers(existingProject.members ?? [])
      setCoverPreview(existingProject.coverImageUrl ?? null)
    } else {
      setName('')
      setColor(PRESET_COLORS[0])
      setDescription('')
      setStatus('active')
      setSelectedMembers([])
      setCoverPreview(null)
    }
  }, [existingProject, open])

  // ─── Member toggle ─────────────────────────────────────────
  const toggleMember = (memberName: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberName)
        ? prev.filter((m) => m !== memberName)
        : [...prev, memberName]
    )
  }

  // ─── Save ──────────────────────────────────────────────────
  const handleSave = () => {
    if (!name.trim()) return

    const baseId = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const newProject: Project = {
      id: existingProject?.id ?? `${baseId}-${Date.now()}`,
      name: name.trim(),
      color,
      description: description.trim() || undefined,
      coverImageUrl: coverPreview ?? undefined,
      status,
      members: selectedMembers.length > 0 ? selectedMembers : undefined,
      createdBy: existingProject?.createdBy ?? currentUser?.name ?? '',
      createdAt: existingProject?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: existingProject?.attachments,
      links: existingProject?.links,
    }

    if (onSave) {
      onSave(newProject)
    } else if (isEditMode && existingProject) {
      updateProject(existingProject.id, {
        name: newProject.name,
        color: newProject.color,
        description: newProject.description,
        coverImageUrl: newProject.coverImageUrl,
        status: newProject.status,
        members: newProject.members,
        updatedAt: newProject.updatedAt,
      })
    } else {
      addProject(newProject)
    }

    handleClose()
  }

  const handleClose = () => {
    setName('')
    setColor(PRESET_COLORS[0])
    setDescription('')
    setStatus('active')
    setSelectedMembers([])
    setCoverPreview(null)
    onClose()
  }

  // ─── Input style ───────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    height: '42px',
    width: '100%',
    borderRadius: '12px',
    border: '1px solid var(--tp-border)',
    backgroundColor: 'var(--tp-bg)',
    color: 'var(--tp-text)',
    fontSize: '14px',
    padding: '0 14px',
    outline: 'none',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: '520px',
          width: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '28px',
          border: '1px solid var(--tp-border)',
          boxShadow: '0 24px 64px rgba(17,19,24,0.18)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-6 pt-6 pb-5 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--tp-bg-2)' }}
          >
            <FolderPlus className="w-5 h-5" style={{ color: 'var(--tp-text-2)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
              {isEditMode ? 'Editar proyecto' : 'Nuevo proyecto'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              {isEditMode
                ? 'Modifica los datos del proyecto'
                : 'Aparecerá en el sidebar y en los selectores de tarea'}
            </p>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
              Nombre del proyecto *
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Ej: Mi nuevo cliente"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
              Descripción
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del proyecto, cliente o campaña..."
              rows={3}
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '1px solid var(--tp-border)',
                backgroundColor: 'var(--tp-bg)',
                color: 'var(--tp-text)',
                fontSize: '14px',
                padding: '10px 14px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
            />
          </div>

          {/* Cover image */}
          <ImageUploader
            label="Imagen de portada"
            value={coverPreview ?? undefined}
            onChange={(url) => setCoverPreview(url)}
            aspectRatio="cover"
          />

          {/* Color picker */}
          <div>
            <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--tp-text-2)' }}>
              Color de identificación
            </p>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.15)' : undefined,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Status toggle */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tp-text-2)' }}>
              Estado
            </p>
            <div className="flex gap-2">
              {(['active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="flex-1 py-2 text-sm font-medium rounded-xl transition-all"
                  style={{
                    backgroundColor: status === s ? 'var(--tp-dark)' : 'var(--tp-bg)',
                    color: status === s ? '#FFFFFF' : 'var(--tp-text-2)',
                    border: `1px solid ${status === s ? 'var(--tp-dark)' : 'var(--tp-border)'}`,
                  }}
                >
                  {s === 'active' ? 'Activo' : 'Inactivo'}
                </button>
              ))}
            </div>
          </div>

          {/* Member selector */}
          <div>
            <p className="text-xs font-semibold mb-2.5" style={{ color: 'var(--tp-text-2)' }}>
              Miembros del equipo
            </p>
            <div className="flex flex-col gap-2">
              {users.map((user) => {
                const checked = selectedMembers.includes(user.name)
                return (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-80"
                    style={{
                      backgroundColor: checked ? `${color}12` : 'var(--tp-bg)',
                      border: `1px solid ${checked ? color : 'var(--tp-border)'}`,
                    }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${user.color}`}
                    >
                      {user.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>
                        {user.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
                        {user.role}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(user.name)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: color }}
                    />
                  </label>
                )
              })}
            </div>
          </div>

          {/* Preview */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ backgroundColor: 'var(--tp-bg)' }}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium" style={{ color: name ? 'var(--tp-text)' : 'var(--tp-text-2)' }}>
              {name || 'Vista previa del proyecto'}
            </span>
            {selectedMembers.length > 0 && (
              <span className="ml-auto text-xs" style={{ color: 'var(--tp-text-2)' }}>
                {selectedMembers.length} miembro{selectedMembers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-end gap-2.5 px-6 py-4 sticky bottom-0"
          style={{
            borderTop: '1px solid var(--tp-border)',
            backgroundColor: 'var(--tp-surface)',
          }}
        >
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70"
            style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
            style={{ backgroundColor: 'var(--tp-dark)', color: '#FFFFFF' }}
          >
            {isEditMode ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
