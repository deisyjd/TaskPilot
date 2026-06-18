'use client'

import { useState, useEffect } from 'react'
import {
  Task, TaskStatus, Priority, TaskType, ChecklistItem, Comment,
  STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, STATUS_DOT_COLORS,
} from '@/types'
import { PROJECT_NAMES } from '@/data/projects'
import { USER_NAMES } from '@/data/users'
import { useTaskStore } from '@/store/useTaskStore'
import { formatDateTime } from '@/lib/dates'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Trash2, Plus, X, Send, CheckSquare, MessageSquare, Tag } from 'lucide-react'

const STATUSES = Object.entries(STATUS_LABELS) as [TaskStatus, string][]
const PRIORITIES = Object.entries(PRIORITY_LABELS) as [Priority, string][]
const TYPES = Object.entries(TYPE_LABELS) as [TaskType, string][]

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function emptyTask(status: TaskStatus = 'pending'): Task {
  const now = new Date().toISOString()
  return {
    id: `t-${uid()}`, title: '', project: PROJECT_NAMES[0], description: '', status,
    assignee: USER_NAMES[0], dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium', type: 'other', tags: [], checklist: [], comments: [],
    createdAt: now, updatedAt: now,
  }
}

interface Props {
  task: Task | null
  defaultStatus?: TaskStatus
  open: boolean
  onClose: () => void
}

const inputStyle = {
  borderRadius: 'var(--tp-r-input)',
  border: '1px solid var(--tp-border)',
  backgroundColor: 'var(--tp-bg)',
  color: 'var(--tp-text)',
  fontSize: '13px',
  padding: '6px 12px',
  width: '100%',
  outline: 'none',
}

const selectStyle = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '30px',
  cursor: 'pointer',
}

export function TaskModal({ task, defaultStatus = 'pending', open, onClose }: Props) {
  const { addTask, updateTask, deleteTask } = useTaskStore()
  const isNew = !task

  const [form, setForm] = useState<Task>(task ?? emptyTask(defaultStatus))
  const [tagInput, setTagInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [commentInput, setCommentInput] = useState('')

  useEffect(() => {
    setForm(task ?? emptyTask(defaultStatus))
    setTagInput(''); setCheckInput(''); setCommentInput('')
  }, [task, defaultStatus, open])

  const set = <K extends keyof Task>(key: K, value: Task[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const addChecklist = () => {
    if (!checkInput.trim()) return
    set('checklist', [...form.checklist, { id: uid(), text: checkInput.trim(), done: false }])
    setCheckInput('')
  }
  const toggleChecklist = (id: string) =>
    set('checklist', form.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)))
  const removeChecklist = (id: string) =>
    set('checklist', form.checklist.filter((c) => c.id !== id))

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || form.tags.includes(tag)) return
    set('tags', [...form.tags, tag]); setTagInput('')
  }
  const removeTag = (tag: string) => set('tags', form.tags.filter((t) => t !== tag))

  const addComment = () => {
    if (!commentInput.trim()) return
    set('comments', [...form.comments, { id: uid(), author: 'Deisy', text: commentInput.trim(), createdAt: new Date().toISOString() }])
    setCommentInput('')
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    isNew ? addTask(form) : updateTask(form.id, form)
    onClose()
  }

  const handleDelete = () => { if (task) { deleteTask(task.id); onClose() } }

  const checklistDone = form.checklist.filter((c) => c.done).length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh]" style={{ borderRadius: 'var(--tp-r-card)', border: '1px solid var(--tp-border)' }}>
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--tp-border)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
              >
                {form.project}
              </span>
              {!isNew && <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>#{task?.id}</span>}
            </div>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Título de la tarea..."
              className="w-full text-xl font-semibold border-0 bg-transparent outline-none placeholder:text-gray-300"
              style={{ color: 'var(--tp-text)' }}
            />
          </div>
          {!isNew && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex overflow-hidden" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Left */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-w-0">
            {/* Description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--tp-text-2)' }}>Descripción</p>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Agrega una descripción..."
                rows={3}
                className="resize-none w-full text-sm outline-none"
                style={{ ...inputStyle, padding: '10px 14px' }}
              />
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--tp-text-2)' }}>
                  Checklist {form.checklist.length > 0 && <span className="font-normal">({checklistDone}/{form.checklist.length})</span>}
                </p>
              </div>
              <div className="space-y-2 mb-3">
                {form.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5 group">
                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(item.id)}
                      className="w-4 h-4 rounded cursor-pointer accent-[#111318] shrink-0" />
                    <span className={cn('text-sm flex-1', item.done ? 'line-through' : '')} style={{ color: item.done ? 'var(--tp-text-2)' : 'var(--tp-text)' }}>
                      {item.text}
                    </span>
                    <button onClick={() => removeChecklist(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: '#DC2626' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={checkInput} onChange={(e) => setCheckInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklist()}
                  placeholder="Agregar ítem..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addChecklist}
                  className="px-3 py-1.5 text-sm font-medium rounded-2xl transition-all hover:opacity-80"
                  style={{ backgroundColor: 'var(--tp-dark)', color: '#fff' }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--tp-text-2)' }}>Comentarios</p>
              </div>
              <div className="space-y-3 mb-3">
                {form.comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--tp-dark)' }}>
                      {c.author[0]}
                    </div>
                    <div className="flex-1 rounded-2xl p-3" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: 'var(--tp-text)' }}>{c.author}</span>
                        <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--tp-text)' }}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Escribe un comentario..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addComment}
                  className="px-3 py-1.5 text-sm font-medium rounded-2xl transition-all hover:opacity-80"
                  style={{ backgroundColor: 'var(--tp-dark)', color: '#fff' }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right metadata */}
          <div className="w-56 shrink-0 overflow-y-auto py-5 px-4 space-y-4" style={{ borderLeft: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-bg)' }}>
            {[
              { label: 'Estado', content: (
                <select value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)} style={selectStyle}>
                  {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )},
              { label: 'Prioridad', content: (
                <select value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)} style={selectStyle}>
                  {PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )},
              { label: 'Tipo', content: (
                <select value={form.type} onChange={(e) => set('type', e.target.value as TaskType)} style={selectStyle}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )},
              { label: 'Proyecto', content: (
                <select value={form.project} onChange={(e) => set('project', e.target.value)} style={selectStyle}>
                  {PROJECT_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )},
              { label: 'Responsable', content: (
                <select value={form.assignee} onChange={(e) => set('assignee', e.target.value)} style={selectStyle}>
                  {USER_NAMES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              )},
              { label: 'Fecha límite', content: (
                <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} style={inputStyle} />
              )},
            ].map(({ label, content }) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--tp-text-2)' }}>{label}</p>
                {content}
              </div>
            ))}

            {/* Tags */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--tp-text-2)' }}>Etiquetas</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}>
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="+ etiqueta" style={{ ...inputStyle, flex: 1, fontSize: '12px', padding: '5px 10px' }} />
                <button onClick={addTag} className="px-2 rounded-xl" style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}>
                  <Tag className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4" style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-full transition-all hover:opacity-70"
            style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!form.title.trim()}
            className="px-5 py-2 text-sm font-medium rounded-full transition-all hover:opacity-88 disabled:opacity-40"
            style={{ backgroundColor: 'var(--tp-dark)', color: '#FFFFFF' }}>
            {isNew ? 'Crear tarea' : 'Guardar cambios'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
