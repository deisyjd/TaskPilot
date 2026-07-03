'use client'

import { Task, STATUS_DOT_COLORS } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { isOverdue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

const TYPE_ICONS: Record<string, string> = {
  design: '🎨', copy: '✍️', publication: '📤', review: '🔍',
  development: '💻', meeting: '📅', strategy: '📊', other: '📌',
}

interface Props { task: Task; onClick: () => void }

export function TimelineCard({ task, onClick }: Props) {
  const project = useTaskStore((s) => s.projects.find((p) => p.id === task.projectId))
  const user = useUserStore((s) => s.users.find((u) => u.name === task.assignee))
  const overdue = isOverdue(task.dueDate, task.status)
  const done = task.status === 'done'

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all hover:shadow-md"
      style={{
        backgroundColor: done ? 'var(--tp-bg-2)' : overdue ? '#FEF2F2' : 'var(--tp-surface)',
        border: `1px solid ${done ? 'transparent' : overdue ? '#FECACA' : 'var(--tp-border)'}`,
        borderRadius: 'var(--tp-r-inner)',
        padding: '10px 12px',
        opacity: done ? 0.7 : 1,
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
          <div className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT_COLORS[task.status])} />
        </div>
        <div className={cn('w-5 h-5 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0', user?.color ?? 'bg-gray-400')}>
          {user?.initials?.[0] ?? task.assignee[0]}
        </div>
      </div>
    </button>
  )
}
