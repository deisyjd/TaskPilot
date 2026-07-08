'use client'

import { useState } from 'react'
import { ExternalLink, X, Link2, Plus, Pencil, Check } from 'lucide-react'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editUrlError, setEditUrlError] = useState<string | null>(null)

  function normalizeUrl(rawUrl: string): string | null {
    const trimmed = rawUrl.trim()
    if (!trimmed) return null
    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`
    return isValidUrl(withProtocol) ? withProtocol : null
  }

  function handleAdd() {
    setUrlError(null)

    if (!form.url.trim()) {
      setUrlError('La URL es requerida.')
      return
    }

    const normalizedUrl = normalizeUrl(form.url)
    if (!normalizedUrl) {
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

  function startEdit(link: ReferenceLink) {
    setEditingId(link.id)
    setEditForm({ url: link.url, title: link.title, description: link.description ?? '' })
    setEditUrlError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditUrlError(null)
  }

  function saveEdit() {
    if (!editingId) return
    setEditUrlError(null)

    if (!editForm.url.trim()) {
      setEditUrlError('La URL es requerida.')
      return
    }

    const normalizedUrl = normalizeUrl(editForm.url)
    if (!normalizedUrl) {
      setEditUrlError('Ingresa una URL válida (ej. https://ejemplo.com).')
      return
    }

    const domain = extractDomain(normalizedUrl)
    onChange(value.map((l) => (l.id === editingId
      ? { ...l, url: normalizedUrl, title: editForm.title.trim() || domain, description: editForm.description.trim() || undefined }
      : l)))
    setEditingId(null)
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

            if (editingId === link.id) {
              return (
                <li
                  key={link.id}
                  className="flex flex-col gap-2 p-3 rounded-[var(--tp-r-input)] border"
                  style={{ background: 'var(--tp-surface)', borderColor: 'var(--tp-lime)' }}
                >
                  <div>
                    <input
                      type="url"
                      placeholder="https://ejemplo.com"
                      value={editForm.url}
                      onChange={(e) => { setEditForm((f) => ({ ...f, url: e.target.value })); setEditUrlError(null) }}
                      className="w-full px-3 py-2 text-sm rounded-[var(--tp-r-input)] border outline-none transition-all focus:border-[var(--tp-lime)]"
                      style={{
                        background: 'var(--tp-bg)',
                        borderColor: editUrlError ? '#ef4444' : 'var(--tp-border)',
                        color: 'var(--tp-text)',
                      }}
                      autoFocus
                    />
                    {editUrlError && <p className="text-xs text-red-500 mt-1">{editUrlError}</p>}
                  </div>
                  <input
                    type="text"
                    placeholder="Título (opcional)"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-[var(--tp-r-input)] border outline-none transition-all focus:border-[var(--tp-lime)]"
                    style={{ background: 'var(--tp-bg)', borderColor: 'var(--tp-border)', color: 'var(--tp-text)' }}
                  />
                  <textarea
                    placeholder="Descripción (opcional)"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-[var(--tp-r-input)] border outline-none resize-none transition-all focus:border-[var(--tp-lime)]"
                    style={{ background: 'var(--tp-bg)', borderColor: 'var(--tp-border)', color: 'var(--tp-text)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--tp-r-btn)] text-xs font-semibold transition-all active:scale-95"
                      style={{ background: 'var(--tp-lime)', color: 'var(--tp-darker)' }}
                    >
                      <Check size={13} />
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 rounded-[var(--tp-r-btn)] text-xs font-medium transition-all hover:bg-[var(--tp-bg-2)]"
                      style={{ color: 'var(--tp-text-2)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </li>
              )
            }

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
                    onClick={() => startEdit(link)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--tp-bg-2)] transition-colors"
                    title="Editar enlace"
                  >
                    <Pencil size={13} style={{ color: 'var(--tp-text-2)' }} />
                  </button>
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
