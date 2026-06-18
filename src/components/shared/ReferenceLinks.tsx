'use client'

import { useState } from 'react'
import { ExternalLink, X, Link2, Plus } from 'lucide-react'
import { ReferenceLink } from '@/types'

interface Props {
  value: ReferenceLink[]
  onChange: (links: ReferenceLink[]) => void
  createdBy: string
  label?: string
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Generate a consistent color from domain string
const LINK_COLORS = [
  '#DFFF5F', '#60A5FA', '#F97316', '#A78BFA',
  '#34D399', '#FB7185', '#FBBF24', '#38BDF8',
]
function getLinkColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return LINK_COLORS[Math.abs(hash) % LINK_COLORS.length]
}

const EMPTY_FORM = { url: '', title: '', description: '' }

export function ReferenceLinks({
  value,
  onChange,
  createdBy,
  label,
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [urlError, setUrlError] = useState<string | null>(null)

  function handleAdd() {
    setUrlError(null)

    const trimmedUrl = form.url.trim()
    if (!trimmedUrl) {
      setUrlError('La URL es requerida.')
      return
    }

    // Auto-prepend protocol if missing
    const normalizedUrl =
      trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
        ? trimmedUrl
        : `https://${trimmedUrl}`

    if (!isValidUrl(normalizedUrl)) {
      setUrlError('Ingresa una URL válida (ej. https://ejemplo.com).')
      return
    }

    const domain = extractDomain(normalizedUrl)
    const newLink: ReferenceLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: normalizedUrl,
      title: form.title.trim() || domain,
      description: form.description.trim() || undefined,
      createdBy,
      createdAt: new Date().toISOString(),
    }

    onChange([...value, newLink])
    setForm(EMPTY_FORM)
  }

  function removeLink(id: string) {
    onChange(value.filter((l) => l.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--tp-text-2)' }}>
          {label}
        </label>
      )}

      {/* Link list */}
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((link) => {
            const domain = extractDomain(link.url)
            const dotColor = getLinkColor(link.id)

            return (
              <li
                key={link.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-[var(--tp-r-input)] border group"
                style={{
                  background: 'var(--tp-surface)',
                  borderColor: 'var(--tp-border)',
                }}
              >
                {/* Colored dot favicon */}
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold"
                  style={{ background: dotColor, color: '#111318' }}
                >
                  {domain.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--tp-text)' }}
                    title={link.title}
                  >
                    {link.title}
                  </p>
                  <p
                    className="text-[11px] truncate"
                    style={{ color: 'var(--tp-text-2)' }}
                    title={domain}
                  >
                    {domain}
                  </p>
                  {link.description && (
                    <p
                      className="text-[11px] mt-0.5 line-clamp-2"
                      style={{ color: 'var(--tp-text-2)', opacity: 0.75 }}
                    >
                      {link.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--tp-bg-2)] transition-colors"
                    title="Abrir enlace"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={13} style={{ color: 'var(--tp-text-2)' }} />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors"
                    title="Eliminar enlace"
                  >
                    <X size={13} className="text-red-500" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Add form */}
      <div
        className="flex flex-col gap-2 p-3 rounded-[var(--tp-r-inner)] border"
        style={{ background: 'var(--tp-surface)', borderColor: 'var(--tp-border)' }}
      >
        <div className="flex items-center gap-2">
          <Link2 size={14} style={{ color: 'var(--tp-lime)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--tp-text-2)' }}>
            Agregar enlace
          </span>
        </div>

        {/* URL */}
        <div>
          <input
            type="url"
            placeholder="https://ejemplo.com"
            value={form.url}
            onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setUrlError(null) }}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 text-sm rounded-[var(--tp-r-input)] border outline-none transition-all focus:border-[var(--tp-lime)]"
            style={{
              background: 'var(--tp-bg)',
              borderColor: urlError ? '#ef4444' : 'var(--tp-border)',
              color: 'var(--tp-text)',
            }}
          />
          {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
        </div>

        {/* Title */}
        <input
          type="text"
          placeholder="Título (opcional)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 text-sm rounded-[var(--tp-r-input)] border outline-none transition-all focus:border-[var(--tp-lime)]"
          style={{
            background: 'var(--tp-bg)',
            borderColor: 'var(--tp-border)',
            color: 'var(--tp-text)',
          }}
        />

        {/* Description */}
        <textarea
          placeholder="Descripción (opcional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-[var(--tp-r-input)] border outline-none resize-none transition-all focus:border-[var(--tp-lime)]"
          style={{
            background: 'var(--tp-bg)',
            borderColor: 'var(--tp-border)',
            color: 'var(--tp-text)',
          }}
        />

        <button
          type="button"
          onClick={handleAdd}
          className="self-start flex items-center gap-1.5 px-4 py-2 rounded-[var(--tp-r-btn)] text-xs font-semibold transition-all active:scale-95"
          style={{ background: 'var(--tp-lime)', color: 'var(--tp-darker)' }}
        >
          <Plus size={13} />
          Agregar
        </button>
      </div>
    </div>
  )
}
