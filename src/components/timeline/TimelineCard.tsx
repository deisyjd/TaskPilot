'use client'

import { Task, TaskStatus, STATUS_LABELS } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore, useCurrentUser } from '@/store/useUserStore'
import { isOverdue } from '@/lib/dates'
import { canEditTask } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { AlertTriangle, Circle, RefreshCw, Eye, CalendarClock, CheckCircle2, Ban, LucideIcon } from 'lucide-react'

const TYPE_ICONS: Record<string, string> = {
  design: '🎨', copy: '✍️', publication: '📤', review: '🔍',
  development: '💻', meeting: '📅', strategy: '📊', other: '📌',
}

const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  pending: Circle,
  'in-progress': RefreshCw,
  review: Eye,
  scheduled: CalendarClock,
  done: CheckCircle2,
  blocked: Ban,
}

const STATUS_ICON_COLORS: Record<TaskStatus, string> = {
  pending: '#9CA3AF',
  'in-progress': '#3B82F6',
  review: '#F59E0B',
  scheduled: '#8B5CF6',
  done: '#22C55E',
  blocked: '#EF4444',
}

interface Props { task: Task; onClick: () => void }

export function TimelineCard({ task, onClick }: Props) {
  const project = useTaskStore((s) => s.projects.find((p) => p.id === task.projectId))
  const user = useUserStore((s) => s.users.find((u) => u.id === task.assigneeIds[0]))
  const currentUser = useCurrentUser()
  const readOnly = !canEditTask(currentUser, task, project)
  const overdue = isOverdue(task.dueDate, task.status)
  const done = task.status === 'done'
  const StatusIcon = STATUS_ICONS[task.status]

  return (
    <button
      onClick={onClick}
      draggable={!readOnly}
      onDragStart={(e) => {
        if (readOnly) return
        e.dataTransfer.setData('taskId', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="w-full text-left transition-all hover:shadow-md"
      style={{
        backgroundColor: done ? 'var(--tp-bg-2)' : overdue ? '#FEF2F2' : 'var(--tp-surface)',
        border: `1px solid ${done ? 'transparent' : overdue ? '#FECACA' : 'var(--tp-border)'}`,
        borderRadius: 'var(--tp-r-inner)',
        padding: '10px 12px',
        opacity: done ? 0.7 : 1,
        cursor: readOnly ? 'pointer' : 'grab',
      }}
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs shrink-0">{TYPE_ICONS[task.type] ?? '📌'}</span>
          <p
            className={cn('text-xs font-medium leading-snug truncate', done && 'line-through')}
            style={{ color: done ? 'var(--tp-text-2)' : 'var(--tp-text)' }}
          >
            {task.title}
          </p>
        </div>
        {overdue && !done && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project?.color ?? '#94a3b8' }} />
          <span className="text-xs truncate max-w-[70px]" style={{ color: 'var(--tp-text-2)' }}>{project?.name ?? 'Sin proyecto'}</span>
          <span title={STATUS_LABELS[task.status]} className="shrink-0 flex items-center">
            <StatusIcon className="w-3.5 h-3.5" style={{ color: STATUS_ICON_COLORS[task.status] }} />
          </span>
          {task.tags.length > 0 && (
            <span
              className="shrink-0 text-[9px] leading-none px-1 py-0.5 rounded-full font-medium truncate max-w-[50px]"
              style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}
            >
              {task.tags[0]}
            </span>
          )}
        </div>
        {user && (
          <div className={cn('w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0', user.color)}>
            {user.initials?.[0]}
          </div>
        )}
      </div>
    </button>
  )
}
