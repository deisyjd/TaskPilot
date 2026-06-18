'use client'

import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: '420px',
          width: '92vw',
          borderRadius: '24px',
          border: '1px solid var(--tp-border)',
          boxShadow: '0 24px 64px rgba(17,19,24,0.2)',
        }}
      >
        <div className="flex flex-col items-center text-center px-8 pt-8 pb-6 gap-4">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <AlertTriangle className="w-7 h-7" style={{ color: '#DC2626' }} />
          </div>

          {/* Text */}
          <div>
            <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--tp-text)' }}>
              {title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--tp-text-2)' }}>
              {description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 w-full pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70"
              style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85"
              style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
