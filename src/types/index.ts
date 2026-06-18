export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'review'
  | 'scheduled'
  | 'done'
  | 'blocked'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskType =
  | 'design'
  | 'copy'
  | 'publication'
  | 'review'
  | 'development'
  | 'meeting'
  | 'strategy'
  | 'other'

export type HistoryEventType =
  | 'task-created'
  | 'task-edited'
  | 'status-changed'
  | 'assignee-changed'
  | 'date-changed'
  | 'task-completed'
  | 'task-overdue'
  | 'published'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Comment {
  id: string
  author: string
  text: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  project: string
  description: string
  status: TaskStatus
  assignee: string
  dueDate: string
  priority: Priority
  type: TaskType
  tags: string[]
  checklist: ChecklistItem[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  role: string
  initials: string
  color: string
}

export interface Project {
  id: string
  name: string
  color: string
}

export interface HistoryEvent {
  id: string
  type: HistoryEventType
  taskId: string
  taskTitle: string
  project: string
  description: string
  user: string
  timestamp: string
  meta?: Record<string, string>
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  'in-progress': 'En proceso',
  review: 'Para revisión',
  scheduled: 'Publicación programada',
  done: 'Publicado / Terminado',
  blocked: 'Bloqueado',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const TYPE_LABELS: Record<TaskType, string> = {
  design: 'Diseño',
  copy: 'Copy',
  publication: 'Publicación',
  review: 'Revisión',
  development: 'Desarrollo',
  meeting: 'Reunión',
  strategy: 'Estrategia',
  other: 'Otro',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-violet-100 text-violet-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}

export const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-gray-400',
  'in-progress': 'bg-blue-500',
  review: 'bg-amber-500',
  scheduled: 'bg-violet-500',
  done: 'bg-green-500',
  blocked: 'bg-red-500',
}
