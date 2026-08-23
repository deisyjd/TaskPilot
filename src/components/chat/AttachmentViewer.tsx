'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'
import type { Attachment } from '@/types'

// Visor a pantalla completa (100%) para los adjuntos del chat. Imágenes y PDF
// se previsualizan; el resto ofrece descarga. Se cierra con Escape o clic fuera.
export function AttachmentViewer({
  attachment,
  onClose,
}: {
  attachment: Attachment | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!attachment) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [attachment, onClose])

  if (!attachment) return null
  if (typeof document === 'undefined') return null

  const isImage = attachment.type?.startsWith('image/')
  const isPdf =
    attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf')

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Barra superior */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-white/90 truncate">{attachment.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={attachment.url}
            download={attachment.name}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar
          </a>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : isPdf ? (
          <iframe
            src={attachment.url}
            title={attachment.name}
            className="w-full h-full rounded-lg bg-white"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white/80">
            <div className="text-6xl">📄</div>
            <p className="text-sm">No hay vista previa para este archivo.</p>
            <a
              href={attachment.url}
              download={attachment.name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
