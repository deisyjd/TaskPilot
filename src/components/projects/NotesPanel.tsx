'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, StickyNote, Save, Check } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { Note, Project } from '@/types'

// ─── Pastel color palette ─────────────────────────────────────
const NOTE_COLORS = [
  '#FFFFFF',   // blanco
  '#FEFCE8',   // amarillo suave
  '#EFF6FF',   // azul suave
  '#F0FDF4',   // verde suave
  '#FFF1F2',   // rosa suave
  '#F5F3FF',   // lila suave
  '#FFF7ED',   // naranja suave
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getPreview(note: Note): string {
  const text = note.content.trim()
  if (!text) return 'Nota vacía…'
  return text.slice(0, 80) + (text.length > 80 ? '…' : '')
}

interface Props {
  project: Project
}

export function NotesPanel({ project }: Props) {
  const addNote = useTaskStore((s) => s.addNote)
  const updateNote = useTaskStore((s) => s.updateNote)
  const deleteNoteAction = useTaskStore((s) => s.deleteNote)

  const notes: Note[] = project.notes ?? []

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editTitle, setEditTitle]   = useState('')
  const [editContent, setEditContent] = useState('')
  const [editColor, setEditColor]   = useState(NOTE_COLORS[0])
  const [isDirty, setIsDirty]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null

  // Auto-grow textarea
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editContent])

  // ─── Save helper ─────────────────────────────────────────────
  async function saveCurrentNote(id: string | null = selectedId) {
    if (!id) return
    const ok = await updateNote(id, { title: editTitle, content: editContent, color: editColor })
    if (!ok) {
      setError('No se pudo guardar la nota. Intenta de nuevo.')
      return
    }
    setError('')
    setIsDirty(false)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  // ─── Select note ─────────────────────────────────────────────
  function handleSelect(note: Note) {
    if (isDirty && selectedId) saveCurrentNote(selectedId)
    setSelectedId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditColor(note.color ?? NOTE_COLORS[0])
    setConfirmDelete(false)
    setIsDirty(false)
    setError('')
  }

  // ─── Create note ─────────────────────────────────────────────
  async function handleCreate() {
    if (isDirty && selectedId) await saveCurrentNote(selectedId)
    const created = await addNote(project.id, { title: '', content: '', color: NOTE_COLORS[1] })
    if (!created) {
      setError('No se pudo crear la nota. Intenta de nuevo.')
      return
    }
    setError('')
    setSelectedId(created.id)
    setEditTitle('')
    setEditContent('')
    setEditColor(NOTE_COLORS[1])
    setConfirmDelete(false)
    setIsDirty(false)
    setTimeout(() => contentRef.current?.focus(), 50)
  }

  // ─── Delete note ─────────────────────────────────────────────
  async function handleDelete() {
    if (!selectedId) return
    const ok = await deleteNoteAction(selectedId)
    if (!ok) {
      setError('No se pudo eliminar la nota. Intenta de nuevo.')
      return
    }
    setError('')
    const updated = notes.filter((n) => n.id !== selectedId)
    const next = updated[0] ?? null
    if (next) {
      setSelectedId(next.id)
      setEditTitle(next.title)
      setEditContent(next.content)
      setEditColor(next.color ?? NOTE_COLORS[0])
    } else {
      setSelectedId(null)
      setEditTitle('')
      setEditContent('')
      setEditColor(NOTE_COLORS[0])
    }
    setConfirmDelete(false)
    setIsDirty(false)
  }

  // ─── Keyboard shortcut: Cmd/Ctrl+S to save ───────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveCurrentNote()
    }
  }

  return (
    <div
      className="flex flex-col gap-3"
      style={{ minHeight: '520px' }}
      onKeyDown={handleKeyDown}
    >
      {error && (
        <div
          className="text-xs font-medium px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
        >
          {error}
        </div>
      )}
      <div className="flex gap-5">
      {/* ── Left: list ─────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 shrink-0"
        style={{ width: '230px' }}
      >
        {/* New note button */}
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-85"
          style={{
            backgroundColor: 'var(--tp-dark)',
            color: '#FFFFFF',
            borderRadius: 'var(--tp-r-btn)',
          }}
        >
          <Plus className="w-4 h-4" />
          Nueva nota
        </button>

        {/* Note cards list */}
        {notes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center"
            style={{
              backgroundColor: 'var(--tp-surface)',
              borderRadius: 'var(--tp-r-card)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <StickyNote className="w-7 h-7" style={{ color: 'var(--tp-text-2)' }} />
            <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
              Aún no hay notas.<br />Crea la primera.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
            {notes.map((note) => {
              const active = note.id === selectedId
              return (
                <button
                  key={note.id}
                  onClick={() => handleSelect(note)}
                  className="w-full text-left p-3.5 transition-all hover:opacity-90"
                  style={{
                    backgroundColor: note.color ?? 'var(--tp-surface)',
                    borderRadius: 'var(--tp-r-card)',
                    border: active
                      ? `2px solid ${project.color}`
                      : '1px solid var(--tp-border)',
                    boxShadow: active ? `0 0 0 1px ${project.color}33` : 'none',
                  }}
                >
                  <p
                    className="text-xs font-semibold truncate mb-1"
                    style={{ color: 'var(--tp-text)' }}
                  >
                    {note.title.trim() || 'Sin título'}
                  </p>
                  <p
                    className="text-xs line-clamp-2 leading-relaxed"
                    style={{ color: 'var(--tp-text-2)' }}
                  >
                    {getPreview(note)}
                  </p>
                  <p
                    className="text-[10px] mt-2"
                    style={{ color: 'var(--tp-text-2)', opacity: 0.7 }}
                  >
                    {formatDate(note.updatedAt)}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right: editor ──────────────────────────────────────── */}
      {!selectedNote ? (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-4"
          style={{
            backgroundColor: 'var(--tp-surface)',
            borderRadius: 'var(--tp-r-card)',
            border: '1px solid var(--tp-border)',
          }}
        >
          <StickyNote className="w-10 h-10" style={{ color: 'var(--tp-text-2)', opacity: 0.4 }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>
              Selecciona o crea una nota
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--tp-text-2)' }}>
              Tus apuntes para este proyecto aparecerán aquí
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--tp-dark)',
              color: '#FFFFFF',
              borderRadius: 'var(--tp-r-btn)',
            }}
          >
            <Plus className="w-4 h-4" />
            Nueva nota
          </button>
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col"
          style={{
            backgroundColor: editColor,
            borderRadius: 'var(--tp-r-card)',
            border: '1px solid var(--tp-border)',
            overflow: 'hidden',
          }}
        >
          {/* Editor toolbar */}
          <div
            className="flex items-center gap-3 px-5 py-3 shrink-0"
            style={{
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              backgroundColor: 'rgba(0,0,0,0.02)',
            }}
          >
            {/* Color picker */}
            <div className="flex items-center gap-1.5">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setEditColor(c); setIsDirty(true) }}
                  title={c}
                  className="w-5 h-5 rounded-full transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    border: editColor === c ? '2px solid var(--tp-dark)' : '1px solid rgba(0,0,0,0.12)',
                  }}
                />
              ))}
            </div>

            <div className="flex-1" />

            {/* Save indicator */}
            {isDirty && (
              <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
                Sin guardar
              </span>
            )}
            {savedFlash && !isDirty && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#10b981' }}>
                <Check className="w-3.5 h-3.5" />
                Guardado
              </span>
            )}

            {/* Save button */}
            <button
              onClick={() => saveCurrentNote()}
              disabled={!isDirty}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-75 disabled:opacity-40"
              style={{
                backgroundColor: 'var(--tp-dark)',
                color: '#FFFFFF',
                borderRadius: 'var(--tp-r-btn)',
              }}
            >
              <Save className="w-3.5 h-3.5" />
              Guardar
            </button>

            {/* Delete */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-75"
                style={{
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  borderRadius: 'var(--tp-r-btn)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: '#DC2626' }}>¿Eliminar?</span>
                <button
                  onClick={handleDelete}
                  className="px-2.5 py-1 text-xs font-semibold rounded-full"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                >
                  Sí
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full"
                  style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
                >
                  No
                </button>
              </div>
            )}
          </div>

          {/* Title input */}
          <div className="px-6 pt-5 pb-2">
            <input
              value={editTitle}
              onChange={(e) => { setEditTitle(e.target.value); setIsDirty(true) }}
              placeholder="Título de la nota"
              className="w-full bg-transparent outline-none font-bold text-xl leading-tight placeholder:opacity-30"
              style={{
                color: 'var(--tp-text)',
                fontFamily: 'var(--font-sora), system-ui, sans-serif',
                border: 'none',
              }}
            />
          </div>

          {/* Content textarea */}
          <div className="flex-1 px-6 pb-6 overflow-y-auto">
            <textarea
              ref={contentRef}
              value={editContent}
              onChange={(e) => { setEditContent(e.target.value); setIsDirty(true) }}
              placeholder="Escribe aquí tu apunte… (Cmd+S para guardar)"
              className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed placeholder:opacity-30"
              style={{
                color: 'var(--tp-text)',
                border: 'none',
                minHeight: '300px',
              }}
            />
          </div>

          {/* Footer meta */}
          <div
            className="px-6 py-2.5 shrink-0 flex items-center justify-between"
            style={{
              borderTop: '1px solid rgba(0,0,0,0.06)',
              backgroundColor: 'rgba(0,0,0,0.02)',
            }}
          >
            <span className="text-xs" style={{ color: 'var(--tp-text-2)', opacity: 0.6 }}>
              Por {selectedNote.createdBy} · {formatDate(selectedNote.createdAt)}
            </span>
            {selectedNote.updatedAt !== selectedNote.createdAt && (
              <span className="text-xs" style={{ color: 'var(--tp-text-2)', opacity: 0.6 }}>
                Editado {formatDate(selectedNote.updatedAt)}
              </span>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
