'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Download, FileText } from 'lucide-react'

export interface PreviewFile {
  name: string
  url: string
  type?: string // 'image' | 'pdf' | otro — si no viene, se infiere de la extensión de la URL.
}

interface Props {
  file: PreviewFile | null
  onClose: () => void
}

function isImage(file: PreviewFile): boolean {
  return file.type === 'image' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(file.url)
}

function isPdf(file: PreviewFile): boolean {
  return file.type === 'pdf' || /\.pdf(\?|$)/i.test(file.url)
}

// Popup genérico para ver una imagen de portada o un archivo adjunto — con
// vista previa inline para imágenes/PDF y botón de descarga siempre visible.
export function FilePreviewModal({ file, onClose }: Props) {
  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{
          maxWidth: '780px',
          width: '92vw',
          maxHeight: '88vh',
          borderRadius: '24px',
          border: '1px solid var(--tp-border)',
          boxShadow: '0 24px 64px rgba(17,19,24,0.18)',
        }}
      >
        {file && (
          <>
            <div
              className="flex items-center justify-between gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid var(--tp-border)' }}
            >
              <p
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--tp-text)' }}
                title={file.name}
              >
                {file.name}
              </p>
              <a
                href={file.url}
                download={file.name}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all hover:opacity-85"
                style={{ background: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
              >
                <Download size={13} />
                Descargar
              </a>
            </div>

            <div
              className="flex items-center justify-center overflow-auto"
              style={{ maxHeight: '72vh', minHeight: '200px', background: 'var(--tp-bg)' }}
            >
              {isImage(file) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-w-full object-contain"
                  style={{ maxHeight: '72vh' }}
                />
              ) : isPdf(file) ? (
                <iframe src={file.url} className="w-full" style={{ height: '72vh', border: 'none' }} title={file.name} />
              ) : (
                <div className="flex flex-col items-center gap-3 py-16">
                  <FileText size={40} style={{ color: 'var(--tp-text-2)' }} />
                  <p className="text-sm" style={{ color: 'var(--tp-text-2)' }}>
                    Vista previa no disponible para este tipo de archivo.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
