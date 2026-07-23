'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Paperclip,
  Link2,
  Plus,
  ExternalLink,
  FileText,
  FileImage,
  File,
  ArrowRight,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
  RefreshCw,
  Pencil,
  Upload,
  User,
  X,
  Archive,
  ArchiveRestore,
  List,
  GanttChartSquare,
} from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore, useCurrentUser } from '@/store/useUserStore'
import { can, canManageProject, isProjectViewer } from '@/lib/permissions'
import { TaskModal } from '@/components/board/TaskModal'
import { ProjectGantt } from '@/components/projects/ProjectGantt'
import {
  Project,
  Attachment,
  ReferenceLink,
  Task,
  TaskStatus,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
} from '@/types'

interface Props {
  project: Project
  onEdit: () => void
}

// ─── Helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <FileImage className="w-4 h-4" />
  if (type.includes('pdf') || type.includes('text')) return <FileText className="w-4 h-4" />
  return <File className="w-4 h-4" />
}

const HISTORY_TYPE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  'task-created':    { icon: <Plus className="w-3.5 h-3.5" />, color: '#6366f1' },
  'task-completed':  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#10b981' },
  'task-edited':     { icon: <Pencil className="w-3.5 h-3.5" />, color: '#6B7280' },
  'status-changed':  { icon: <RefreshCw className="w-3.5 h-3.5" />, color: '#0ea5e9' },
  'assignee-changed':{ icon: <User className="w-3.5 h-3.5" />, color: '#f59e0b' },
  'date-changed':    { icon: <Calendar className="w-3.5 h-3.5" />, color: '#8b5cf6' },
  'task-overdue':    { icon: <AlertCircle className="w-3.5 h-3.5" />, color: '#ef4444' },
  'published':       { icon: <ArrowRight className="w-3.5 h-3.5" />, color: '#DFFF5F' },
  'file-added':      { icon: <Paperclip className="w-3.5 h-3.5" />, color: '#14b8a6' },
  'link-added':      { icon: <Link2 className="w-3.5 h-3.5" />, color: '#ec4899' },
}

// ─── Sub-components ───────────────────────────────────────────

function UserAvatar({ userId, users }: { userId: string; users: import('@/types').User[] }) {
  const user = users.find((u: import('@/types').User) => u.id === userId)
  const label = user?.name ?? userId
  return (
    <div
      title={label}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 -ml-2 first:ml-0 border-2 border-white ${user?.color ?? 'bg-gray-400'}`}
    >
      {user?.initials ?? label.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────

export function ProjectDetail({ project, onEdit }: Props) {
  const tasks = useTaskStore((s) => s.tasks)
  const history = useTaskStore((s) => s.history)
  const archiveProject = useTaskStore((s) => s.archiveProject)
  const restoreProject = useTaskStore((s) => s.restoreProject)
  const updateProject = useTaskStore((s) => s.updateProject)
  const users = useUserStore((s) => s.users)
  const currentUser = useCurrentUser()
  const isViewer = isProjectViewer(currentUser, project)

  const [linkForm, setLinkForm] = useState({ url: '', title: '' })
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [tasksView, setTasksView] = useState<'list' | 'gantt'>('list')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived data
  const projectTasks = tasks.filter((t) => t.projectId === project.id)
  const projectHistory = history.filter((e) => e.project === project.name).slice(0, 8)
  const allAttachments: Attachment[] = project.attachments ?? []
  const allLinks: ReferenceLink[] = project.links ?? []

  const tasksByStatus = projectTasks.reduce<Record<TaskStatus, typeof projectTasks>>((acc, t) => {
    if (!acc[t.status]) acc[t.status] = []
    acc[t.status].push(t)
    return acc
  }, {} as Record<TaskStatus, typeof projectTasks>)

  const openNewTask = () => { setEditingTask(null); setTaskModalOpen(true) }
  const openEditTask = (task: Task) => { setEditingTask(task); setTaskModalOpen(true) }
  const closeTaskModal = () => { setTaskModalOpen(false); setEditingTask(null) }

  // ─── File upload ──────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const attachment: Attachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: reader.result as string, // base64; in production: upload to Supabase/S3
        uploadedBy: currentUser?.name ?? '',
        uploadedAt: new Date().toISOString(),
      }
      setAttachmentError(null)
      try {
        await updateProject(project.id, { attachments: [...allAttachments, attachment] })
      } catch {
        setAttachmentError('No se pudo guardar el archivo. Intenta de nuevo.')
      }
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const removeAttachment = async (id: string) => {
    setAttachmentError(null)
    try {
      await updateProject(project.id, { attachments: allAttachments.filter((a) => a.id !== id) })
    } catch {
      setAttachmentError('No se pudo eliminar el archivo. Intenta de nuevo.')
    }
  }

  // ─── Add link ─────────────────────────────────────────────
  const handleAddLink = async () => {
    if (!linkForm.url.trim()) return
    const link: ReferenceLink = {
      id: `link-${Date.now()}`,
      title: linkForm.title.trim() || getDomain(linkForm.url),
      url: linkForm.url.trim(),
      createdBy: currentUser?.name ?? '',
      createdAt: new Date().toISOString(),
    }
    setLinkError(null)
    try {
      await updateProject(project.id, { links: [...allLinks, link] })
      setLinkForm({ url: '', title: '' })
      setShowLinkForm(false)
    } catch {
      setLinkError('No se pudo guardar el enlace. Intenta de nuevo.')
    }
  }

  const removeLink = async (id: string) => {
    setLinkError(null)
    try {
      await updateProject(project.id, { links: allLinks.filter((l) => l.id !== id) })
    } catch {
      setLinkError('No se pudo eliminar el enlace. Intenta de nuevo.')
    }
  }

  // ─── Hero gradient ────────────────────────────────────────
  const heroGradient = `linear-gradient(135deg, ${project.color}cc 0%, ${project.color}55 60%, transparent 100%)`

  return (
    <div className="flex flex-col gap-6">
      {/* ── 1. Hero / Cover ───────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ borderRadius: 'var(--tp-r-card)', aspectRatio: '16/5', minHeight: '200px' }}
      >
        {project.coverImageUrl ? (
          <img
            src={project.coverImageUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: heroGradient, backgroundColor: `${project.color}33` }}
          >
            <span
              className="text-7xl font-bold select-none"
              style={{ color: project.color, opacity: 0.3 }}
            >
              {project.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
          }}
        />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
            <h1
              className="text-2xl font-bold"
              style={{ color: '#FFFFFF', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
            >
              {project.name}
            </h1>
            {/* Status badge */}
            <span
              className="px-2.5 py-1 text-xs font-semibold rounded-full"
              style={{
                backgroundColor: project.status === 'inactive' ? 'rgba(0,0,0,0.4)' : 'rgba(223,255,95,0.9)',
                color: project.status === 'inactive' ? '#fff' : '#111318',
              }}
            >
              {project.status === 'inactive' ? 'Inactivo' : 'Activo'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {can(currentUser, 'create_task') && !isViewer && (
              <button
                onClick={openNewTask}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-90"
                style={{
                  backgroundColor: 'var(--tp-lime)',
                  color: '#111318',
                  borderRadius: 'var(--tp-r-btn)',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva tarea
              </button>
            )}
            {canManageProject(currentUser, project) && (
              <>
                {project.status === 'inactive' ? (
                  <button
                    onClick={() => restoreProject(project.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'rgba(34,197,94,0.25)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      borderRadius: 'var(--tp-r-btn)',
                      border: '1px solid rgba(34,197,94,0.4)',
                    }}
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    Restaurar
                  </button>
                ) : confirmArchive ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70">¿Archivar proyecto?</span>
                    <button
                      onClick={() => { archiveProject(project.id); setConfirmArchive(false) }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ backgroundColor: 'rgba(220,38,38,0.7)', color: '#fff' }}
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmArchive(false)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmArchive(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(8px)',
                      color: 'rgba(255,255,255,0.7)',
                      borderRadius: 'var(--tp-r-btn)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archivar
                  </button>
                )}

                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    color: '#FFFFFF',
                    borderRadius: 'var(--tp-r-btn)',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Info section ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Description */}
          <div
            className="p-5"
            style={{
              backgroundColor: 'var(--tp-surface)',
              borderRadius: 'var(--tp-r-card)',
              boxShadow: 'var(--tp-shadow-sm)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tp-text-2)' }}>
              Descripción
            </h2>
            {project.description ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--tp-text)' }}>
                {project.description}
              </p>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--tp-text-2)' }}>
                Sin descripción. Edita el proyecto para agregar una.
              </p>
            )}
          </div>

          {/* Members */}
          {(project.members?.length ?? 0) > 0 && (
            <div
              className="p-5"
              style={{
                backgroundColor: 'var(--tp-surface)',
                borderRadius: 'var(--tp-r-card)',
                boxShadow: 'var(--tp-shadow-sm)',
                border: '1px solid var(--tp-border)',
              }}
            >
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tp-text-2)' }}>
                Miembros ({project.members!.length})
              </h2>
              <div className="flex items-center gap-1 flex-wrap">
                <div className="flex items-center">
                  {project.members!.map((memberId) => (
                    <UserAvatar key={memberId} userId={memberId} users={users} />
                  ))}
                </div>
                <div className="ml-3 flex flex-col gap-0.5">
                  {project.members!.map((memberId) => {
                    const u = users.find((u) => u.id === memberId)
                    return (
                      <span key={memberId} className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
                        {u?.name ?? memberId}{u?.role ? ` — ${u.role}` : ''}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div
            className="p-5"
            style={{
              backgroundColor: 'var(--tp-surface)',
              borderRadius: 'var(--tp-r-card)',
              boxShadow: 'var(--tp-shadow-sm)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--tp-text-2)' }}>
                Tareas del proyecto ({projectTasks.length})
              </h2>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1 p-0.5 rounded-lg"
                  style={{ backgroundColor: 'var(--tp-bg)', border: '1px solid var(--tp-border)' }}
                >
                  <button
                    onClick={() => setTasksView('list')}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors"
                    style={{
                      backgroundColor: tasksView === 'list' ? 'var(--tp-dark)' : 'transparent',
                      color: tasksView === 'list' ? 'var(--tp-lime)' : 'var(--tp-text-2)',
                    }}
                  >
                    <List className="w-3.5 h-3.5" />
                    Lista
                  </button>
                  <button
                    onClick={() => setTasksView('gantt')}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors"
                    style={{
                      backgroundColor: tasksView === 'gantt' ? 'var(--tp-dark)' : 'transparent',
                      color: tasksView === 'gantt' ? 'var(--tp-lime)' : 'var(--tp-text-2)',
                    }}
                  >
                    <GanttChartSquare className="w-3.5 h-3.5" />
                    Gantt
                  </button>
                </div>
                {can(currentUser, 'create_task') && !isViewer && (
                  <button
                    onClick={openNewTask}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-75"
                    style={{
                      backgroundColor: 'var(--tp-dark)',
                      color: '#FFFFFF',
                      borderRadius: 'var(--tp-r-btn)',
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Nueva tarea
                  </button>
                )}
                <Link
                  href="/board"
                  className="flex items-center gap-1 text-xs font-medium transition-all hover:opacity-70"
                  style={{ color: project.color }}
                >
                  Ver en tablero
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {projectTasks.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--tp-text-2)' }}>
                No hay tareas en este proyecto aún.
              </p>
            ) : tasksView === 'gantt' ? (
              <ProjectGantt tasks={projectTasks} onTaskClick={openEditTask} />
            ) : (
              <div className="flex flex-col gap-3">
                {(Object.entries(tasksByStatus) as [TaskStatus, typeof projectTasks][]).map(([status, tasks]) => (
                  <div key={status}>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                      style={{ color: 'var(--tp-text-2)' }}
                    >
                      {STATUS_LABELS[status]} ({tasks.length})
                    </p>
                    <div className="flex flex-col gap-1">
                      {tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => openEditTask(task)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors hover:opacity-80"
                          style={{ backgroundColor: 'var(--tp-bg)', border: '1px solid var(--tp-border)' }}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLORS[task.status]}`}
                          />
                          <span className="flex-1 text-sm truncate" style={{ color: 'var(--tp-text)' }}>
                            {task.title}
                          </span>
                          <span className="text-xs shrink-0 truncate max-w-[120px]" style={{ color: 'var(--tp-text-2)' }}>
                            {task.assigneeIds.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean).join(', ') || 'Sin asignar'}
                          </span>
                          {task.dueDate && (
                            <span
                              className="text-xs shrink-0"
                              style={{ color: 'var(--tp-text-2)' }}
                            >
                              {new Date(task.dueDate).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          <div
            className="p-5"
            style={{
              backgroundColor: 'var(--tp-surface)',
              borderRadius: 'var(--tp-r-card)',
              boxShadow: 'var(--tp-shadow-sm)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tp-text-2)' }}>
              Actividad reciente
            </h2>

            {projectHistory.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--tp-text-2)' }}>
                Sin actividad registrada aún.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {projectHistory.map((event) => {
                  const iconMeta = HISTORY_TYPE_ICONS[event.type] ?? {
                    icon: <Clock className="w-3.5 h-3.5" />,
                    color: '#6B7280',
                  }
                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${iconMeta.color}18`, color: iconMeta.color }}
                      >
                        {iconMeta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: 'var(--tp-text)' }}>
                          <span className="font-medium">{event.user}</span>{' '}
                          <span style={{ color: 'var(--tp-text-2)' }}>{event.description}</span>
                        </p>
                        {event.taskTitle && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--tp-text-2)' }}>
                            {event.taskTitle}
                          </p>
                        )}
                      </div>
                      <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
                        {formatRelative(event.timestamp)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Project details card */}
          <div
            className="p-5"
            style={{
              backgroundColor: 'var(--tp-surface)',
              borderRadius: 'var(--tp-r-card)',
              boxShadow: 'var(--tp-shadow-sm)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tp-text-2)' }}>
              Detalles del proyecto
            </h2>

            <div className="flex flex-col gap-3">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Estado</span>
                <span
                  className="px-2.5 py-1 text-xs font-semibold rounded-full"
                  style={{
                    backgroundColor: project.status === 'inactive' ? '#f1f5f9' : '#dcfce7',
                    color: project.status === 'inactive' ? '#64748b' : '#166534',
                  }}
                >
                  {project.status === 'inactive' ? 'Inactivo' : 'Activo'}
                </span>
              </div>

              {/* Color */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Color</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-xs font-mono" style={{ color: 'var(--tp-text)' }}>
                    {project.color}
                  </span>
                </div>
              </div>

              {/* Created by */}
              {project.createdBy && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Creado por</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--tp-text)' }}>
                    {project.createdBy}
                  </span>
                </div>
              )}

              {/* Created at */}
              {project.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Fecha de creación</span>
                  <span className="text-xs" style={{ color: 'var(--tp-text)' }}>
                    {formatDate(project.createdAt)}
                  </span>
                </div>
              )}

              {/* Tasks count */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Tareas totales</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--tp-text)' }}>
                  {projectTasks.length}
                </span>
              </div>

              {/* Done tasks */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Completadas</span>
                <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
                  {projectTasks.filter((t) => t.status === 'done').length}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            {projectTasks.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Progreso</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--tp-text)' }}>
                    {Math.round((projectTasks.filter((t) => t.status === 'done').length / projectTasks.length) * 100)}%
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--tp-bg-2)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((projectTasks.filter((t) => t.status === 'done').length / projectTasks.length) * 100)}%`,
                      backgroundColor: project.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div
            className="p-5"
            style={{
              backgroundColor: 'var(--tp-surface)',
              borderRadius: 'var(--tp-r-card)',
              boxShadow: 'var(--tp-shadow-sm)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--tp-text-2)' }}>
                Archivos ({allAttachments.length})
              </h2>
              {can(currentUser, 'upload_file') && !isViewer && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-75"
                    style={{
                      backgroundColor: 'var(--tp-bg-2)',
                      color: 'var(--tp-text)',
                      borderRadius: 'var(--tp-r-btn)',
                    }}
                  >
                    <Upload className="w-3 h-3" />
                    Subir
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </>
              )}
            </div>

            {attachmentError && (
              <p className="text-xs mb-3" style={{ color: '#DC2626' }}>{attachmentError}</p>
            )}

            {allAttachments.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--tp-text-2)' }}>
                Sin archivos adjuntos.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {allAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
                    style={{ backgroundColor: 'var(--tp-bg)', border: '1px solid var(--tp-border)' }}
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 flex-1 min-w-0 transition-all hover:opacity-80"
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
                      >
                        {getFileIcon(att.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--tp-text)' }}>
                          {att.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
                          {formatBytes(att.size)}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--tp-text-2)' }} />
                    </a>
                    {can(currentUser, 'upload_file') && !isViewer && (
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        style={{ color: '#DC2626' }}
                        title="Eliminar archivo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reference links */}
          <div
            className="p-5"
            style={{
              backgroundColor: 'var(--tp-surface)',
              borderRadius: 'var(--tp-r-card)',
              boxShadow: 'var(--tp-shadow-sm)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--tp-text-2)' }}>
                Links de referencia ({allLinks.length})
              </h2>
              {!isViewer && (
                <button
                  onClick={() => setShowLinkForm((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all hover:opacity-75"
                  style={{
                    backgroundColor: 'var(--tp-bg-2)',
                    color: 'var(--tp-text)',
                    borderRadius: 'var(--tp-r-btn)',
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Agregar
                </button>
              )}
            </div>

            {/* Add link form */}
            {showLinkForm && !isViewer && (
              <div
                className="mb-3 p-3 rounded-xl flex flex-col gap-2"
                style={{ backgroundColor: 'var(--tp-bg)', border: '1px solid var(--tp-border)' }}
              >
                <input
                  value={linkForm.url}
                  onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://ejemplo.com"
                  style={{
                    height: '36px',
                    width: '100%',
                    borderRadius: 'var(--tp-r-input)',
                    border: '1px solid var(--tp-border)',
                    backgroundColor: 'var(--tp-surface)',
                    color: 'var(--tp-text)',
                    fontSize: '13px',
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
                <input
                  value={linkForm.title}
                  onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Título (opcional)"
                  style={{
                    height: '36px',
                    width: '100%',
                    borderRadius: 'var(--tp-r-input)',
                    border: '1px solid var(--tp-border)',
                    backgroundColor: 'var(--tp-surface)',
                    color: 'var(--tp-text)',
                    fontSize: '13px',
                    padding: '0 12px',
                    outline: 'none',
                  }}
                />
                {linkError && (
                  <p className="text-xs" style={{ color: '#DC2626' }}>{linkError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLink}
                    disabled={!linkForm.url.trim()}
                    className="flex-1 py-2 text-xs font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
                    style={{ backgroundColor: 'var(--tp-dark)', color: '#FFFFFF' }}
                  >
                    Agregar link
                  </button>
                  <button
                    onClick={() => { setShowLinkForm(false); setLinkForm({ url: '', title: '' }); setLinkError(null) }}
                    className="px-3 py-2 text-xs font-medium rounded-full transition-all hover:opacity-70"
                    style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {allLinks.length === 0 ? (
              <p className="text-xs italic" style={{ color: 'var(--tp-text-2)' }}>
                Sin links de referencia.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {allLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
                    style={{ backgroundColor: 'var(--tp-bg)', border: '1px solid var(--tp-border)' }}
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 flex-1 min-w-0 transition-all hover:opacity-80"
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
                      >
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--tp-text)' }}>
                          {link.title}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--tp-text-2)' }}>
                          {getDomain(link.url)}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--tp-text-2)' }} />
                    </a>
                    {!isViewer && (
                      <button
                        onClick={() => removeLink(link.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        style={{ color: '#DC2626' }}
                        title="Eliminar enlace"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskModal
        task={editingTask}
        defaultProject={project.id}
        open={taskModalOpen}
        onClose={closeTaskModal}
      />
    </div>
  )
}
