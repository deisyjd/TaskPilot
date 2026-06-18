// ─── Task types ───────────────────────────────────────────────
export type TaskStatus = 'pending' | 'in-progress' | 'review' | 'scheduled' | 'done' | 'blocked'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskType =
  | 'design' | 'copy' | 'publication' | 'review'
  | 'development' | 'meeting' | 'strategy' | 'other'

// ─── User / permissions ────────────────────────────────────────
export type UserRole = 'admin' | 'member' | 'viewer'
export type UserStatus = 'active' | 'inactive'

// ─── Project ───────────────────────────────────────────────────
export type ProjectStatus = 'active' | 'inactive'

// ─── Chat ─────────────────────────────────────────────────────
export type ConversationType = 'direct' | 'group'

// ─── Permissions ──────────────────────────────────────────────
export type PermissionAction =
  | 'create_project' | 'edit_project' | 'delete_project'
  | 'create_user' | 'edit_user' | 'deactivate_user'
  | 'create_task' | 'edit_task' | 'delete_task'
  | 'upload_file' | 'change_cover'
  | 'create_chat' | 'send_message'

// ─── History events ────────────────────────────────────────────
export type HistoryEventType =
  | 'task-created' | 'task-edited' | 'status-changed' | 'assignee-changed'
  | 'date-changed' | 'task-completed' | 'task-overdue' | 'published'
  | 'user-created' | 'user-edited' | 'user-deactivated'
  | 'project-created' | 'project-edited' | 'project-image-updated'
  | 'file-added' | 'file-removed' | 'link-added'
  | 'chat-created' | 'message-sent'

// ─── Sub-entities ─────────────────────────────────────────────
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

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  // In production: upload to S3 / Supabase Storage / Firebase Storage
  url: string // base64 data URL or object URL for local storage
  uploadedBy: string
  uploadedAt: string
}

export interface ReferenceLink {
  id: string
  title: string
  url: string
  description?: string
  createdBy: string
  createdAt: string
}

// ─── Core entities ────────────────────────────────────────────
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
  // Extended fields
  coverImageUrl?: string
  attachments?: Attachment[]
  links?: ReferenceLink[]
}

export interface User {
  id: string
  name: string
  role: string       // display title (e.g. "Directora", "Diseñador")
  initials: string
  color: string      // Tailwind bg-* class for avatar
  // Extended fields
  email?: string
  userRole?: UserRole
  avatarUrl?: string
  status?: UserStatus
  createdAt?: string
  updatedAt?: string
}

export interface Project {
  id: string
  name: string
  color: string
  // Extended fields
  description?: string
  coverImageUrl?: string
  status?: ProjectStatus
  createdBy?: string
  members?: string[]
  createdAt?: string
  updatedAt?: string
  attachments?: Attachment[]
  links?: ReferenceLink[]
}

export interface HistoryEvent {
  id: string
  type: HistoryEventType
  taskId?: string
  taskTitle?: string
  project?: string
  description: string
  user: string
  timestamp: string
  meta?: Record<string, string>
}

export interface Conversation {
  id: string
  type: ConversationType
  name: string
  coverImageUrl?: string
  members: string[]  // user ids
  createdBy: string
  createdAt: string
  updatedAt: string
  lastMessageAt?: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  text: string
  attachments?: Attachment[]
  links?: ReferenceLink[]
  createdAt: string
  updatedAt: string
}

// ─── Labels & display maps ────────────────────────────────────
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
