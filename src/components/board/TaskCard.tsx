'use client'

import { Task, STATUS_LABELS, PRIORITY_COLORS, STATUS_DOT_COLORS, TaskStatus } from '@/types'
import { getProject } from '@/data/projects'
import { getUser } from '@/data/users'
import { isOverdue, isToday, formatDate } from '@/lib/dates'
import { useTaskStore } from '@/store/useTaskStore'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AlertTriangle, Calendar, CheckSquare, ChevronDown } from 'lucide-react'

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in-progress', label: 'En proceso' },
  { value: 'review', label: 'Para revisión' },
  { value: 'scheduled', label: 'Pub. programada' },
  { value: 'done', label: 'Publicado / Terminado' },
  { value: 'blocked', label: 'Bloqueado' },
]

const PRIORITY_LEFT_BORDER: Record<string, string> = {
  low: 'border-l-gray-300',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
}

interface Props {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: Props) {
  const moveTask = useTaskStore((s) => s.moveTask)
  const project = getProject(task.project)
  const user = getUser(task.assignee)
  const overdue = isOverdue(task.dueDate, task.status)
  const dueToday = isToday(task.dueDate)
  const checklistDone = task.checklist.filter((c) => c.done).length
  const checklistTotal = task.checklist.length

  return (
    <div
      className={cn(
        'group bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4',
        PRIORITY_LEFT_BORDER[task.priority]
      )}
      onClick={onClick}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 flex-1">
            {task.title}
          </p>
          <div
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 rounded p-0.5 hover:bg-gray-100 transition-all">
                <div className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS[task.status])} />
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    className="flex items-center gap-2 text-sm"
                    onClick={() => moveTask(task.id, s.value)}
                  >
                    <div className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS[s.value])} />
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project badge */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: project?.color ?? '#94a3b8' }}
          />
          <span className="text-xs text-gray-500 truncate">{task.project}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Due date */}
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                overdue ? 'text-red-500' : dueToday ? 'text-amber-500' : 'text-gray-400'
              )}
            >
              {overdue ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <Calendar className="w-3 h-3" />
              )}
              <span>{formatDate(task.dueDate)}</span>
            </div>

            {/* Checklist */}
            {checklistTotal > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <CheckSquare className="w-3 h-3" />
                <span>
                  {checklistDone}/{checklistTotal}
                </span>
              </div>
            )}
          </div>

          {/* Assignee */}
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
              user?.color ?? 'bg-gray-400'
            )}
            title={task.assignee}
          >
            {user?.initials?.[0] ?? task.assignee[0]}
          </div>
        </div>
      </div>
    </div>
  )
}
