'use client'

// Los archivos se suben al volumen del servidor (/api/uploads) y en la BD se
// guarda solo la URL, no el base64.

import { useRef, useState } from 'react'
import { X, Eye, FileUp } from 'lucide-react'
import { Attachment } from '@/types'
import { uploadFile } from '@/lib/uploadFile'
import { FilePreviewModal } from '@/components/shared/FilePreviewModal'

interface Props {
  value: Attachment[]
  onChange: (files: Attachment[]) => void
  uploadedBy: string
  maxFiles?: number
  label?: string
  readOnly?: boolean
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/webp': 'image',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xls',
  'text/csv': 'xls',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
}

function getFileIcon(type: string): string {
  if (type === 'pdf') return '📄'
  if (type === 'image') return '🖼'
  if (type === 'doc') return '📝'
  if (type === 'xls') return '📊'
  if (type === 'zip') return '🗜'
  return '📎'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploader({
  value,
  onChange,
  uploadedBy,
  maxFiles = 10,
  label,
  readOnly = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null)

  // Subida secuencial, acumulando sobre una copia local para no perder
  // adjuntos por closures obsoletos cuando se suben varios a la vez.
  async function addFiles(files: File[]) {
    setError(null)
    setUploading(true)
    let current = value
    try {
      for (const file of files) {
        const detectedType = ALLOWED_MIME[file.type]
        if (!detectedType) {
          setError(`Tipo de archivo no permitido: ${file.name}`)
          continue
        }
        if (file.size > MAX_SIZE_BYTES) {
          setError(`"${file.name}" supera el límite de 10 MB.`)
          continue
        }
        if (current.length >= maxFiles) {
          setError(`Máximo ${maxFiles} archivos permitidos.`)
          break
        }
        try {
          const url = await uploadFile(file)
          const attachment: Attachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            type: detectedType,
            size: file.size,
            url,
            uploadedBy,
            uploadedAt: new Date().toISOString(),
          }
          current = [...current, attachment]
          onChange(current)
        } catch (err) {
          setError(err instanceof Error ? err.message : `No se pudo subir "${file.name}".`)
        }
      }
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    addFiles(files)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function removeFile(id: string) {
    onChange(value.filter((f) => f.id !== id))
  }

  const canAddMore = value.length < maxFiles

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--tp-text-2)' }}>
          {label}
        </label>
      )}

      {/* Drop zone */}
      {canAddMore && !readOnly && (
        <div
          className={`relative border-2 border-dashed rounded-[var(--tp-r-inner)] p-5 flex flex-col items-center gap-2 cursor-pointer transition-all ${
            dragging
              ? 'border-[var(--tp-lime)] bg-[var(--tp-lime)]/5 scale-[1.01]'
              : 'border-[var(--tp-border)] hover:border-[var(--tp-lime)]/50'
          }`}
          style={{ background: dragging ? undefined : 'var(--tp-surface)' }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--tp-bg-2)' }}
          >
            <FileUp size={18} style={{ color: 'var(--tp-lime)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>
              {uploading ? 'Subiendo…' : 'Arrastra archivos aquí'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              o{' '}
              <span
                className="underline cursor-pointer"
                style={{ color: 'var(--tp-lime)' }}
              >
                selecciona desde tu equipo
              </span>
            </p>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--tp-text-2)', opacity: 0.6 }}>
            PDF, PNG, JPG, WEBP, DOC, DOCX, XLS, XLSX, CSV, ZIP · Máx 10 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.zip"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* File list */}
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((file) => (
            <li
              key={file.id}
              onClick={() => setPreviewFile(file)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--tp-r-input)] border cursor-pointer transition-colors hover:bg-[var(--tp-bg)]"
              style={{
                background: 'var(--tp-surface)',
                borderColor: 'var(--tp-border)',
              }}
            >
              {/* Icon */}
              <span className="text-xl leading-none flex-shrink-0">
                {getFileIcon(file.type)}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--tp-text)' }}
                  title={file.name}
                >
                  {file.name}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--tp-text-2)' }}>
                  {formatSize(file.size)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewFile(file) }}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--tp-bg-2)]"
                  title="Ver archivo"
                >
                  <Eye size={13} style={{ color: 'var(--tp-text-2)' }} />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id) }}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-red-100"
                    title="Eliminar"
                  >
                    <X size={13} className="text-red-500" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!canAddMore && (
        <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
          Límite de {maxFiles} archivos alcanzado.
        </p>
      )}

      <FilePreviewModal
        file={previewFile ? { name: previewFile.name, url: previewFile.url, type: previewFile.type } : null}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  )
}
