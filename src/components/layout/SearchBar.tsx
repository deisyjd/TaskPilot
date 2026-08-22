'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTaskStore } from '@/store/useTaskStore'
import { Search, FolderOpen, CheckSquare, FileText, CornerDownLeft } from 'lucide-react'

type ResultType = 'project' | 'task' | 'note'

interface Result {
  type: ResultType
  id: string
  title: string
  subtitle: string
  href: string
}

const TYPE_META: Record<ResultType, { label: string; Icon: typeof FolderOpen }> = {
  project: { label: 'Proyectos', Icon: FolderOpen },
  task: { label: 'Tareas', Icon: CheckSquare },
  note: { label: 'Documentos', Icon: FileText },
}

const has = (value: string | undefined | null, term: string) => (value ?? '').toLowerCase().includes(term)
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ')

export function SearchBar() {
  const router = useRouter()
  const projects = useTaskStore((s) => s.projects)
  const tasks = useTaskStore((s) => s.tasks)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Sin proyecto'

  const results = useMemo<Result[]>(() => {
    const term = query.trim().toLowerCase()
    if (term.length < 2) return []

    const proj: Result[] = projects
      .filter((p) => has(p.name, term) || has(p.description, term))
      .slice(0, 5)
      .map((p) => ({ type: 'project', id: p.id, title: p.name, subtitle: p.description || 'Proyecto', href: `/projects/${p.id}` }))

    const tsk: Result[] = tasks
      .filter((t) => has(t.title, term) || has(t.description, term))
      .slice(0, 6)
      .map((t) => ({ type: 'task', id: t.id, title: t.title || '(sin título)', subtitle: projectName(t.projectId), href: `/board?task=${t.id}` }))

    const notes: Result[] = projects
      .flatMap((p) => (p.notes ?? []).map((n) => ({ note: n, projectId: p.id, projectName: p.name })))
      .filter(({ note }) => has(note.title, term) || has(stripHtml(note.content), term))
      .slice(0, 5)
      .map(({ note, projectId, projectName: pn }) => ({ type: 'note', id: note.id, title: note.title || '(sin título)', subtitle: pn, href: `/projects/${projectId}` }))

    return [...proj, ...tsk, ...notes]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, projects, tasks])

  // Cierra al hacer click fuera.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0)
  }, [query])

  function go(r: Result) {
    setOpen(false)
    setQuery('')
    router.push(r.href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) go(results[active]) }
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--tp-text-2)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar proyectos, tareas, documentos…"
          className="w-full text-sm outline-none"
          style={{
            height: '38px',
            padding: '0 12px 0 36px',
            borderRadius: 'var(--tp-r-input)',
            border: '1px solid var(--tp-border)',
            backgroundColor: 'var(--tp-surface)',
            color: 'var(--tp-text)',
          }}
        />
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-11 z-50 overflow-hidden"
          style={{ borderRadius: '16px', border: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)', boxShadow: '0 12px 40px rgba(17,19,24,0.16)' }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--tp-text-2)' }}>
              Sin resultados para “{query.trim()}”.
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto py-1">
              {(['project', 'task', 'note'] as ResultType[]).map((type) => {
                const group = results.filter((r) => r.type === type)
                if (group.length === 0) return null
                const { label, Icon } = TYPE_META[type]
                return (
                  <div key={type}>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--tp-text-2)' }}>
                      {label}
                    </p>
                    {group.map((r) => {
                      const idx = results.indexOf(r)
                      const isActive = idx === active
                      return (
                        <button
                          key={`${r.type}-${r.id}`}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => go(r)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                          style={{ backgroundColor: isActive ? 'var(--tp-bg)' : 'transparent' }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: 'var(--tp-text)' }}>{r.title}</p>
                            <p className="text-[11px] truncate" style={{ color: 'var(--tp-text-2)' }}>{r.subtitle}</p>
                          </div>
                          {isActive && <CornerDownLeft className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--tp-text-2)' }} />}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
