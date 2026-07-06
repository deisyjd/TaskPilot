'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Building2 } from 'lucide-react'

const PRESET_COLORS = [
  '#6366f1', '#0ea5e9', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#22c55e',
]

interface Props {
  open: boolean
  onClose: () => void
}

export function CompanyModal({ open, onClose }: Props) {
  const addCompany = useAuthStore((s) => s.addCompany)
  const fetchAll = useTaskStore((s) => s.fetchAll)
  const fetchUsers = useUserStore((s) => s.fetchUsers)

  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setName('')
    setColor(PRESET_COLORS[0])
    setError('')
    onClose()
  }

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    const ok = await addCompany(name.trim(), color)
    setSaving(false)
    if (!ok) {
      setError('No se pudo crear la empresa. Intenta de nuevo.')
      return
    }
    await Promise.all([fetchAll(), fetchUsers()])
    handleClose()
  }

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
          maxWidth: '440px',
          width: '92vw',
          borderRadius: '28px',
          border: '1px solid var(--tp-border)',
          boxShadow: '0 24px 64px rgba(17,19,24,0.18)',
        }}
      >
        <div
          className="flex items-center gap-3 px-6 pt-6 pb-5"
          style={{ borderBottom: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--tp-bg-2)' }}
          >
            <Building2 className="w-5 h-5" style={{ color: 'var(--tp-text-2)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
              Nueva empresa
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              Serás administrador/a de esta empresa
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
              Nombre de la empresa *
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Ej: Mi nueva empresa"
              autoFocus
              style={inputStyle}
            />
          </div>

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

          {error && (
            <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

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
            disabled={!name.trim() || saving}
            className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
            style={{ backgroundColor: 'var(--tp-dark)', color: '#FFFFFF' }}
          >
            {saving ? 'Creando...' : 'Crear empresa'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
