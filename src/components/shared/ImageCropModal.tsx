'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Check, ZoomIn } from 'lucide-react'

interface Props {
  file: File
  aspect: number // 16/9 para portada (horizontal), 1 para avatar
  onCancel: () => void
  onCropped: (blob: Blob) => void
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    img.src = src
  })
}

// Recorta la región seleccionada (en píxeles del original) a un canvas del
// tamaño de salida y devuelve un JPEG comprimido.
async function cropToBlob(src: string, area: Area, aspect: number): Promise<Blob> {
  const image = await loadImage(src)
  const outW = aspect > 1 ? 1280 : 400
  const outH = Math.round(outW / aspect)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outW, outH)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
      'image/jpeg',
      0.85
    )
  })
}

export function ImageCropModal({ file, aspect, onCancel, onCropped }: Props) {
  const [src, setSrc] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setAreaPixels(areaPx)
  }, [])

  async function handleConfirm() {
    if (!areaPixels) return
    setBusy(true)
    setError('')
    try {
      const blob = await cropToBlob(src, areaPixels, aspect)
      onCropped(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: '520px', width: '92vw', borderRadius: '24px', border: '1px solid var(--tp-border)' }}
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--tp-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
            Ajustar imagen
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
            Arrastra y usa el zoom para elegir qué parte se ve{aspect > 1 ? ' (formato horizontal)' : ''}.
          </p>
        </div>

        <div className="relative w-full" style={{ height: '320px', background: '#111318' }}>
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              restrictPosition
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--tp-border)' }}>
          <ZoomIn className="w-4 h-4 shrink-0" style={{ color: 'var(--tp-text-2)' }} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 cursor-pointer"
            style={{ accentColor: 'var(--tp-dark)' }}
          />
        </div>

        {error && <p className="px-6 pb-2 text-xs text-red-500">{error}</p>}

        <div
          className="flex items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-5 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70 disabled:opacity-50"
            style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !areaPixels}
            className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-50"
            style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
          >
            <Check className="w-4 h-4" />
            {busy ? 'Procesando…' : 'Usar imagen'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
