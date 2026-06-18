'use client'

import { Task, STATUS_DOT_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/types'
import { getProject } from '@/data/projects'
import { getUser } from '@/data/users'
import { isOverdue, isToday } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface Props {
  task: Task
  onClick: () => void
}

const TYPE_ICONS: Record<string, string> = {
  design: '🎨',
  copy: '✍️',
  publication: '📤',
  review: '🔍',
  development: '💻',
  meeting: '📅',
  strategy: '📊',
  other: '📌',
}

export function TimelineCard({ task, onClick }: Props) {
  const project = getProject(task.project)
  const user = getUser(task.assignee)
  const overdue = isOverdue(task.dueDate, task.status)
  const today = isToday(task.dueDate)
  const done = task.status === 'done'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border px-3 py-2.5 transition-all hover:shadow-sm',
        done
          ? 'bg-gray-50 border-gray-100 opacity-60'
          : overdue
          ? 'bg-red-50 border-red-100'
          : 'bg-white border-gray-100 hover:border-violet-200'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs">{TYPE_ICONS[task.type] ?? '📌'}</span>
          <p
            className={cn(
              'text-sm font-medium leading-snug truncate',
              done ? 'line-through text-gray-400' : 'text-gray-900'
            )}
          >
            {task.title}
          </p>
        </div>
        {overdue && !done && (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1"
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: project?.color ?? '#94a3b8' }}
            />
            <span className="text-xs text-gray-400 truncate max-w-[80px]">{task.project}</span>
          </div>
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT_COLORS[task.status])} />
        </div>

        <div
          className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
            user?.color ?? 'bg-gray-400'
          )}
          title={task.assignee}
        >
          {user?.initials?.[0] ?? task.assignee[0]}
        </div>
      </div>
    </button>
  )
}
