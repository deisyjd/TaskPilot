'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Company } from '@/types'
import { TriangleAlert } from 'lucide-react'

interface Props {
  open: boolean
  company: Company
  onClose: () => void
}

export function DeleteCompanyModal({ open, company, onClose }: Props) {
  const deleteCompany = useAuthStore((s) => s.deleteCompany)
  const fetchAll = useTaskStore((s) => s.fetchAll)
  const fetchUsers = useUserStore((s) => s.fetchUsers)

  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const matches = confirmText.trim() === company.name

  const handleClose = () => {
    setConfirmText('')
    setError('')
    onClose()
  }

  const handleDelete = async () => {
    if (!matches || deleting) return
    setDeleting(true)
    setError('')
    const result = await deleteCompany(company.id)
    setDeleting(false)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo eliminar la empresa')
      return
    }
    await Promise.all([fetchAll(), fetchUsers()])
    handleClose()
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
            style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}
          >
            <TriangleAlert className="w-5 h-5" style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
              Eliminar &quot;{company.name}&quot;
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--tp-text-2)' }}>
            Se eliminarán permanentemente todos los proyectos, tareas e historial de esta empresa,
            y todos sus miembros perderán acceso a ella.
          </p>

          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
              Escribe <span style={{ color: 'var(--tp-text)' }}>{company.name}</span> para confirmar
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
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
            onClick={handleDelete}
            disabled={!matches || deleting}
            className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
            style={{ backgroundColor: '#ef4444', color: '#FFFFFF' }}
          >
            {deleting ? 'Eliminando...' : 'Eliminar empresa'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
