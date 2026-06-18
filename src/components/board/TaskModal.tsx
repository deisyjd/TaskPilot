'use client'

import { useState, useEffect } from 'react'
import {
  Task,
  TaskStatus,
  Priority,
  TaskType,
  ChecklistItem,
  Comment,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  STATUS_DOT_COLORS,
  PRIORITY_COLORS,
} from '@/types'
import { PROJECT_NAMES } from '@/data/projects'
import { USER_NAMES } from '@/data/users'
import { useTaskStore } from '@/store/useTaskStore'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/dates'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Trash2,
  Plus,
  X,
  Send,
  CheckSquare,
  MessageSquare,
  Tag,
} from 'lucide-react'

const STATUSES = Object.entries(STATUS_LABELS) as [TaskStatus, string][]
const PRIORITIES = Object.entries(PRIORITY_LABELS) as [Priority, string][]
const TYPES = Object.entries(TYPE_LABELS) as [TaskType, string][]

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyTask(status: TaskStatus = 'pending'): Task {
  const now = new Date().toISOString()
  return {
    id: `t-${uid()}`,
    title: '',
    project: PROJECT_NAMES[0],
    description: '',
    status,
    assignee: USER_NAMES[0],
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    type: 'other',
    tags: [],
    checklist: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
  }
}

interface Props {
  task: Task | null
  defaultStatus?: TaskStatus
  open: boolean
  onClose: () => void
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
    setTagInput('')
    setCheckInput('')
    setCommentInput('')
  }, [task, defaultStatus, open])

  const set = <K extends keyof Task>(key: K, value: Task[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const addChecklist = () => {
    if (!checkInput.trim()) return
    const item: ChecklistItem = { id: uid(), text: checkInput.trim(), done: false }
    set('checklist', [...form.checklist, item])
    setCheckInput('')
  }

  const toggleChecklist = (id: string) =>
    set(
      'checklist',
      form.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    )

  const removeChecklist = (id: string) =>
    set('checklist', form.checklist.filter((c) => c.id !== id))

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || form.tags.includes(tag)) return
    set('tags', [...form.tags, tag])
    setTagInput('')
  }

  const removeTag = (tag: string) => set('tags', form.tags.filter((t) => t !== tag))

  const addComment = () => {
    if (!commentInput.trim()) return
    const comment: Comment = {
      id: uid(),
      author: 'Deisy',
      text: commentInput.trim(),
      createdAt: new Date().toISOString(),
    }
    set('comments', [...form.comments, comment])
    setCommentInput('')
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    if (isNew) {
      addTask(form)
    } else {
      updateTask(form.id, form)
    }
    onClose()
  }

  const handleDelete = () => {
    if (!task) return
    deleteTask(task.id)
    onClose()
  }

  const checklistDone = form.checklist.filter((c) => c.done).length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-normal text-gray-500">
                {form.project}
              </Badge>
              {!isNew && (
                <span className="text-xs text-gray-300">#{task?.id}</span>
              )}
            </div>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Título de la tarea..."
              className="text-lg font-semibold border-0 p-0 h-auto shadow-none focus-visible:ring-0 text-gray-900 placeholder:text-gray-300"
            />
          </div>
          {!isNew && (
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0"
              title="Eliminar tarea"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex overflow-hidden" style={{ maxHeight: 'calc(90vh - 130px)' }}>
          {/* Left — main content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-w-0">
            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Descripción
              </p>
              <Textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Agrega una descripción..."
                className="text-sm resize-none min-h-[80px] bg-gray-50 border-gray-100"
                rows={3}
              />
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Checklist
                  </p>
                  {form.checklist.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {checklistDone}/{form.checklist.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 mb-2">
                {form.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklist(item.id)}
                      className="w-4 h-4 rounded accent-violet-600 cursor-pointer shrink-0"
                    />
                    <span
                      className={cn(
                        'text-sm flex-1',
                        item.done ? 'line-through text-gray-400' : 'text-gray-700'
                      )}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => removeChecklist(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={checkInput}
                  onChange={(e) => setCheckInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChecklist()}
                  placeholder="Agregar ítem..."
                  className="text-sm h-8 bg-gray-50 border-gray-100"
                />
                <Button size="sm" variant="ghost" onClick={addChecklist} className="h-8 px-2">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Comentarios
                </p>
              </div>

              <div className="space-y-3 mb-3">
                {form.comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5">
                      {c.author[0]}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{c.author}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Escribe un comentario..."
                  className="text-sm h-8 bg-gray-50 border-gray-100"
                />
                <Button size="sm" variant="ghost" onClick={addComment} className="h-8 px-2">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right — metadata */}
          <div className="w-60 shrink-0 border-l border-gray-100 px-4 py-4 space-y-4 overflow-y-auto bg-gray-50/50">
            <Field label="Estado">
              <Select value={form.status} onValueChange={(v) => v && set('status', v as TaskStatus)}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS[form.status])} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(([v, label]) => (
                    <SelectItem key={v} value={v} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS[v])} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Prioridad">
              <Select value={form.priority} onValueChange={(v) => v && set('priority', v as Priority)}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(([v, label]) => (
                    <SelectItem key={v} value={v} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tipo">
              <Select value={form.type} onValueChange={(v) => v && set('type', v as TaskType)}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map(([v, label]) => (
                    <SelectItem key={v} value={v} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Proyecto">
              <Select value={form.project} onValueChange={(v) => v && set('project', v)}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_NAMES.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Responsable">
              <Select value={form.assignee} onValueChange={(v) => v && set('assignee', v)}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_NAMES.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Fecha límite">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </Field>

            <Field label="Etiquetas">
              <div className="flex flex-wrap gap-1 mb-1.5">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 bg-violet-50 text-violet-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="+ etiqueta"
                  className="h-7 text-xs bg-white"
                />
                <Button size="sm" variant="ghost" onClick={addTag} className="h-7 px-2">
                  <Tag className="w-3 h-3" />
                </Button>
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-white">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!form.title.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isNew ? 'Crear tarea' : 'Guardar cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {children}
    </div>
  )
}
