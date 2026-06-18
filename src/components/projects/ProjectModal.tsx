'use client'

import { useState } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FolderPlus } from 'lucide-react'

const PRESET_COLORS = [
  '#6366f1', '#0ea5e9', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#22c55e',
  '#f97316', '#06b6d4', '#a855f7', '#84cc16', '#DFFF5F',
]

interface Props {
  open: boolean
  onClose: () => void
}

export function ProjectModal({ open, onClose }: Props) {
  const addProject = useTaskStore((s) => s.addProject)

  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  const handleSave = () => {
    if (!name.trim()) return
    addProject({
      id: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + `-${Date.now()}`,
      name: name.trim(),
      color,
    })
    setName('')
    setColor(PRESET_COLORS[0])
    onClose()
  }

  const handleClose = () => {
    setName('')
    setColor(PRESET_COLORS[0])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: '440px',
          width: '92vw',
          borderRadius: '28px',
          border: '1px solid var(--tp-border)',
          boxShadow: '0 24px 64px rgba(17,19,24,0.18)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 pt-6 pb-5"
          style={{ borderBottom: '1px solid var(--tp-border)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--tp-bg-2)' }}
          >
            <FolderPlus className="w-5 h-5" style={{ color: 'var(--tp-text-2)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
              Nuevo proyecto
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              Aparecerá en el sidebar y en los selectores de tarea
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
              Nombre del proyecto
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Ej: Mi nuevo cliente"
              autoFocus
              style={{
                height: '42px',
                width: '100%',
                borderRadius: '12px',
                border: '1px solid var(--tp-border)',
                backgroundColor: 'var(--tp-bg)',
                color: 'var(--tp-text)',
                fontSize: '14px',
                padding: '0 14px',
                outline: 'none',
              }}
            />
          </div>

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
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transform: color === c ? 'scale(1.15)' : undefined,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
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
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
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
            Crear proyecto
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
