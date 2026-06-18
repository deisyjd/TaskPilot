'use client'

// In production: upload to S3/Supabase Storage/Firebase Storage, store URL instead of base64

import { useRef, useState } from 'react'
import { Upload, X, RefreshCw, ImageIcon } from 'lucide-react'

interface Props {
  value?: string        // current image URL or base64
  onChange: (url: string | null) => void
  label?: string
  className?: string
  aspectRatio?: 'square' | 'cover'  // square=1:1, cover=16:9
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp']

export function ImageUploader({
  value,
  onChange,
  label,
  className = '',
  aspectRatio = 'square',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const containerClass =
    aspectRatio === 'cover'
      ? 'aspect-video w-full'
      : 'aspect-square w-full max-w-[200px]'

  function handleFile(file: File) {
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no válido. Usa PNG, JPG o WEBP.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('El archivo supera el límite de 5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') onChange(result)
    }
    reader.readAsDataURL(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--tp-text-2)' }}>
          {label}
        </label>
      )}

      <div
        className={`relative rounded-[var(--tp-r-inner)] overflow-hidden border-2 transition-all cursor-pointer select-none ${containerClass} ${
          dragging ? 'border-[var(--tp-lime)] scale-[1.01]' : 'border-[var(--tp-border)]'
        }`}
        style={{ background: 'var(--tp-surface)' }}
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {value ? (
          /* Image preview */
          <>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {/* Overlay buttons */}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--tp-r-btn)] text-xs font-semibold transition-all active:scale-95"
                style={{ background: 'var(--tp-lime)', color: 'var(--tp-darker)' }}
              >
                <RefreshCw size={12} />
                Cambiar
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(null); setError(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--tp-r-btn)] text-xs font-semibold bg-white/20 text-white transition-all active:scale-95 hover:bg-red-500/80"
              >
                <X size={12} />
                Eliminar
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 min-h-[120px]">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--tp-bg-2)' }}
            >
              <ImageIcon size={22} style={{ color: 'var(--tp-text-2)' }} />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
                Arrastra una imagen aquí
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)', opacity: 0.6 }}>
                o
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--tp-r-btn)] text-xs font-semibold mx-auto transition-all active:scale-95"
                style={{ background: 'var(--tp-lime)', color: 'var(--tp-darker)' }}
              >
                <Upload size={12} />
                Seleccionar
              </button>
            </div>
            <p className="text-[10px] text-center" style={{ color: 'var(--tp-text-2)', opacity: 0.5 }}>
              PNG, JPG, WEBP · Máx 5 MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
