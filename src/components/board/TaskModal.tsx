'use client'

import { useState, useEffect } from 'react'
import {
  Task, TaskStatus, Priority, TaskType,
  STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, STATUS_DOT_COLORS,
} from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { formatDateTime } from '@/lib/dates'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import { Trash2, Plus, X, Send, CheckSquare, MessageSquare, Tag, ChevronDown, Image } from 'lucide-react'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { FileUploader } from '@/components/shared/FileUploader'
import { ReferenceLinks } from '@/components/shared/ReferenceLinks'
import { Attachment, ReferenceLink } from '@/types'

const STATUSES = Object.entries(STATUS_LABELS) as [TaskStatus, string][]
const PRIORITIES = Object.entries(PRIORITY_LABELS) as [Priority, string][]
const TYPES = Object.entries(TYPE_LABELS) as [TaskType, string][]

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  pending:    { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
  'in-progress': { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' },
  review:     { bg: '#FDF4FF', text: '#9333EA', dot: '#A855F7' },
  scheduled:  { bg: '#FFF7ED', text: '#EA580C', dot: '#F97316' },
  done:       { bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E' },
  blocked:    { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
}

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  low:    { bg: '#F0FDF4', text: '#16A34A' },
  medium: { bg: '#FFFBEB', text: '#D97706' },
  high:   { bg: '#FFF7ED', text: '#EA580C' },
  urgent: { bg: '#FEF2F2', text: '#DC2626' },
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function emptyTask(status: TaskStatus = 'pending', project = 'Qenta', assignee = ''): Task {
  const now = new Date().toISOString()
  return {
    id: `t-${uid()}`, title: '', project, description: '', status,
    assignee, dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium', type: 'other', tags: [], checklist: [], comments: [],
    createdAt: now, updatedAt: now,
  }
}

interface Props {
  task: Task | null
  defaultStatus?: TaskStatus
  defaultProject?: string
  open: boolean
  onClose: () => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
      {children}
    </p>
  )
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
        style={{ color: 'var(--tp-text-2)' }}
      />
    </div>
  )
}

const fieldSelect: React.CSSProperties = {
  height: '40px',
  width: '100%',
  borderRadius: '12px',
  border: '1px solid var(--tp-border)',
  backgroundColor: 'var(--tp-surface)',
  color: 'var(--tp-text)',
  fontSize: '13px',
  padding: '0 36px 0 12px',
  appearance: 'none',
  cursor: 'pointer',
  outline: 'none',
}

const fieldInput: React.CSSProperties = {
  height: '40px',
  width: '100%',
  borderRadius: '12px',
  border: '1px solid var(--tp-border)',
  backgroundColor: 'var(--tp-surface)',
  color: 'var(--tp-text)',
  fontSize: '13px',
  padding: '0 12px',
  outline: 'none',
}

export function TaskModal({ task, defaultStatus = 'pending', defaultProject, open, onClose }: Props) {
  const { addTask, updateTask, deleteTask } = useTaskStore()
  const projects = useTaskStore((s) => s.projects)
  const users = useUserStore((s) => s.users).filter((u) => u.status !== 'inactive')
  const isNew = !task

  const defaultAssignee = users[0]?.name ?? ''
  const [form, setForm] = useState<Task>(task ?? emptyTask(defaultStatus, defaultProject, defaultAssignee))
  const [tagInput, setTagInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [commentInput, setCommentInput] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setForm(task ?? emptyTask(defaultStatus, defaultProject, defaultAssignee))
    setTagInput(''); setCheckInput(''); setCommentInput('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, defaultStatus, defaultProject, open])

  const attachments: Attachment[] = form.attachments ?? []
  const links: ReferenceLink[] = form.links ?? []

  const setField = <K extends keyof Task>(key: K, value: Task[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const addChecklist = () => {
    if (!checkInput.trim()) return
    setField('checklist', [...form.checklist, { id: uid(), text: checkInput.trim(), done: false }])
    setCheckInput('')
  }
  const toggleChecklist = (id: string) =>
    setField('checklist', form.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)))
  const removeChecklist = (id: string) =>
    setField('checklist', form.checklist.filter((c) => c.id !== id))

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || form.tags.includes(tag)) return
    setField('tags', [...form.tags, tag]); setTagInput('')
  }
  const removeTag = (tag: string) => setField('tags', form.tags.filter((t) => t !== tag))

  const addComment = () => {
    if (!commentInput.trim()) return
    setField('comments', [...form.comments, {
      id: uid(), author: 'Deisy', text: commentInput.trim(), createdAt: new Date().toISOString(),
    }])
    setCommentInput('')
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    isNew ? addTask(form) : updateTask(form.id, form)
    onClose()
  }

  const handleDeleteConfirmed = () => {
    if (task) { deleteTask(task.id); onClose() }
  }

  const checklistDone = form.checklist.filter((c) => c.done).length
  const checklistPct = form.checklist.length > 0 ? Math.round((checklistDone / form.checklist.length) * 100) : 0
  const statusCfg = STATUS_COLORS[form.status]
  const priorityCfg = PRIORITY_COLORS[form.priority]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 flex flex-col"
        style={{
          maxWidth: '880px',
          width: '95vw',
          height: '90vh',
          maxHeight: '90vh',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
          boxShadow: '0 24px 64px rgba(17,19,24,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start gap-4 px-7 pt-6 pb-5 shrink-0"
          style={{ borderBottom: '1px solid var(--tp-border)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
              >
                {form.project}
              </span>
              {!isNew && (
                <span className="text-xs font-mono" style={{ color: 'var(--tp-text-2)', opacity: 0.5 }}>
                  #{task?.id.slice(0, 18)}
                </span>
              )}
            </div>
            <input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Título de la tarea..."
              className="w-full text-2xl font-semibold border-0 bg-transparent outline-none"
              style={{ color: 'var(--tp-text)', lineHeight: '1.3' }}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left: content ── */}
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7 min-w-0">

            {/* Description */}
            <div>
              <FieldLabel>Descripción</FieldLabel>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Agrega contexto, notas o instrucciones sobre esta tarea..."
                rows={4}
                className="resize-none w-full text-sm outline-none"
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--tp-border)',
                  backgroundColor: 'var(--tp-bg)',
                  color: 'var(--tp-text)',
                  fontSize: '13px',
                  padding: '12px 14px',
                  lineHeight: '1.6',
                }}
              />
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                  <FieldLabel>
                    Checklist{form.checklist.length > 0 && (
                      <span className="font-normal ml-1" style={{ color: 'var(--tp-text-2)' }}>
                        {checklistDone}/{form.checklist.length}
                      </span>
                    )}
                  </FieldLabel>
                </div>
              </div>

              {form.checklist.length > 0 && (
                <div className="mb-3">
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${checklistPct}%`, backgroundColor: checklistPct === 100 ? '#22C55E' : 'var(--tp-dark)' }}
                    />
                  </div>
                  <div className="space-y-2">
                    {form.checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all"
                        style={{ backgroundColor: item.done ? 'var(--tp-bg)' : 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleChecklist(item.id)}
                          className="w-4 h-4 rounded cursor-pointer shrink-0"
                          style={{ accentColor: '#111318' }}
                        />
                        <span
                          className={cn('text-sm flex-1', item.done ? 'line-through' : '')}
                          style={{ color: item.done ? 'var(--tp-text-2)' : 'var(--tp-text)' }}
                        >
                          {item.text}
                        </span>
                        <button
                          onClick={() => removeChecklist(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          style={{ color: '#DC2626' }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={checkInput}
                  onChange={(e) => setCheckInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklist()}
                  placeholder="Nuevo ítem del checklist..."
                  style={{ ...fieldInput, flex: 1, backgroundColor: 'var(--tp-bg)' }}
                />
                <button
                  onClick={addChecklist}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80 shrink-0"
                  style={{ backgroundColor: 'var(--tp-dark)', color: '#fff' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cover image */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                <FieldLabel>Imagen de portada</FieldLabel>
              </div>
              <ImageUploader
                value={form.coverImageUrl}
                onChange={(url) => setField('coverImageUrl', url ?? undefined)}
                aspectRatio="cover"
              />
            </div>

            {/* Attachments */}
            <FileUploader
              value={attachments}
              onChange={(files) => setField('attachments', files)}
              uploadedBy="Deisy"
            />

            {/* Reference links */}
            <ReferenceLinks
              value={links}
              onChange={(l) => setField('links', l)}
              createdBy="Deisy"
            />

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                <FieldLabel>Comentarios</FieldLabel>
              </div>

              {form.comments.length > 0 && (
                <div className="space-y-3 mb-3">
                  {form.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: 'var(--tp-dark)' }}
                      >
                        {c.author[0]}
                      </div>
                      <div className="flex-1 rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--tp-bg)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold" style={{ color: 'var(--tp-text)' }}>{c.author}</span>
                          <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--tp-text)' }}>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Escribe un comentario..."
                  style={{ ...fieldInput, flex: 1, backgroundColor: 'var(--tp-bg)' }}
                />
                <button
                  onClick={addComment}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80 shrink-0"
                  style={{ backgroundColor: 'var(--tp-dark)', color: '#fff' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: metadata ── */}
          <div
            className="overflow-y-auto py-6 px-5 space-y-5"
            style={{
              width: '272px',
              minWidth: '272px',
              borderLeft: '1px solid var(--tp-border)',
              backgroundColor: 'var(--tp-bg)',
            }}
          >
            {/* Status */}
            <div>
              <FieldLabel>Estado</FieldLabel>
              <SelectWrapper>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as TaskStatus)}
                  style={{
                    ...fieldSelect,
                    backgroundColor: statusCfg.bg,
                    color: statusCfg.text,
                    border: `1px solid ${statusCfg.dot}30`,
                    fontWeight: '500',
                  }}
                >
                  {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </SelectWrapper>
            </div>

            {/* Priority */}
            <div>
              <FieldLabel>Prioridad</FieldLabel>
              <SelectWrapper>
                <select
                  value={form.priority}
                  onChange={(e) => setField('priority', e.target.value as Priority)}
                  style={{
                    ...fieldSelect,
                    backgroundColor: priorityCfg.bg,
                    color: priorityCfg.text,
                    border: `1px solid ${priorityCfg.text}30`,
                    fontWeight: '500',
                  }}
                >
                  {PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </SelectWrapper>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: 'var(--tp-border)' }} />

            {/* Type */}
            <div>
              <FieldLabel>Tipo</FieldLabel>
              <SelectWrapper>
                <select
                  value={form.type}
                  onChange={(e) => setField('type', e.target.value as TaskType)}
                  style={fieldSelect}
                >
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </SelectWrapper>
            </div>

            {/* Project */}
            <div>
              <FieldLabel>Proyecto</FieldLabel>
              <SelectWrapper>
                <select
                  value={form.project}
                  onChange={(e) => setField('project', e.target.value)}
                  style={fieldSelect}
                >
                  {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </SelectWrapper>
            </div>

            {/* Assignee */}
            <div>
              <FieldLabel>Responsable</FieldLabel>
              <SelectWrapper>
                <select
                  value={form.assignee}
                  onChange={(e) => setField('assignee', e.target.value)}
                  style={fieldSelect}
                >
                  {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </SelectWrapper>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: 'var(--tp-border)' }} />

            {/* Due date */}
            <div>
              <FieldLabel>Fecha límite</FieldLabel>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setField('dueDate', e.target.value)}
                style={{ ...fieldInput, backgroundColor: 'var(--tp-surface)' }}
              />
            </div>

            {/* Tags */}
            <div>
              <FieldLabel>Etiquetas</FieldLabel>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="+ etiqueta"
                  style={{ ...fieldInput, flex: 1, fontSize: '12px', height: '36px', backgroundColor: 'var(--tp-surface)' }}
                />
                <button
                  onClick={addTag}
                  className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
                  style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
                >
                  <Tag className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center px-7 py-4 shrink-0 gap-2.5"
          style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
        >
          {/* Delete — left, only in edit mode */}
          {!isNew && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-80"
              style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70"
              style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.title.trim()}
              className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-88 disabled:opacity-40"
              style={{ backgroundColor: 'var(--tp-dark)', color: '#FFFFFF' }}
            >
              {isNew ? 'Crear tarea' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar esta tarea?"
        description={`"${form.title || 'Esta tarea'}" se eliminará permanentemente y no se podrá recuperar.`}
        confirmLabel="Sí, eliminar"
        onConfirm={() => { setConfirmOpen(false); handleDeleteConfirmed() }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Dialog>
  )
}
