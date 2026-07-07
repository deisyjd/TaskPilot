'use client'

import { useState } from 'react'
import { Task, STATUS_DOT_COLORS, TaskStatus } from '@/types'
import { isOverdue, isToday, formatDate } from '@/lib/dates'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AlertTriangle, Calendar, CheckSquare, ChevronDown, GripVertical } from 'lucide-react'

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in-progress', label: 'En proceso' },
  { value: 'review', label: 'Para revisión' },
  { value: 'scheduled', label: 'Pub. programada' },
  { value: 'done', label: 'Publicado / Terminado' },
  { value: 'blocked', label: 'Bloqueado' },
]

const PRIORITY_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  low:    { bg: '#DCFCE7', text: '#16A34A', label: 'Baja' },
  medium: { bg: '#FEF9C3', text: '#CA8A04', label: 'Media' },
  high:   { bg: '#FFEDD5', text: '#EA580C', label: 'Alta' },
  urgent: { bg: '#FEE2E2', text: '#DC2626', label: 'Urgente' },
}

interface Props {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: Props) {
  const moveTask = useTaskStore((s) => s.moveTask)
  const project = useTaskStore((s) => s.projects.find((p) => p.id === task.projectId))
  const users = useUserStore((s) => s.users)
  const user = users.find((u) => u.id === task.assigneeIds[0])
  const extraAssignees = task.assigneeIds.length - 1
  const overdue = isOverdue(task.dueDate, task.status)
  const dueToday = isToday(task.dueDate)
  const checklistDone = task.checklist.filter((c) => c.done).length
  const checklistTotal = task.checklist.length
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : null
  const badge = PRIORITY_BADGES[task.priority]
  const [dragging, setDragging] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      className="group transition-all hover:shadow-md"
      style={{
        backgroundColor: 'var(--tp-surface)',
        borderRadius: 'var(--tp-r-inner)',
        border: '1px solid var(--tp-border)',
        boxShadow: 'var(--tp-shadow-sm)',
        opacity: dragging ? 0.4 : 1,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onClick={onClick}
    >
      <div className="p-3.5">
        {/* Project + status row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <GripVertical
              className="w-3 h-3 opacity-0 group-hover:opacity-30 shrink-0 -ml-1 transition-opacity"
              style={{ color: 'var(--tp-text-2)' }}
            />
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: project?.color ?? '#94a3b8' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>{project?.name ?? 'Sin proyecto'}</span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 hover:bg-gray-100 transition-all">
                <div className={cn('w-2 h-2 rounded-full', STATUS_DOT_COLORS[task.status])} />
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl">
                {STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    className="flex items-center gap-2 text-sm rounded-xl"
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

        {/* Title */}
        <p
          className="text-sm font-medium leading-snug line-clamp-2 mb-3"
          style={{ color: 'var(--tp-text)' }}
        >
          {task.title}
        </p>

        {/* Checklist progress */}
        {checklistPct !== null && (
          <div className="h-1 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${checklistPct}%`,
                backgroundColor: checklistPct === 100 ? '#22C55E' : 'var(--tp-dark)',
              }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Due date */}
            <div className="flex items-center gap-1 text-xs" style={{ color: overdue ? '#EF4444' : dueToday ? '#F59E0B' : 'var(--tp-text-2)' }}>
              {overdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
              <span>{formatDate(task.dueDate)}</span>
            </div>
            {/* Checklist */}
            {checklistPct !== null && (
              <div className="flex items-center gap-1 text-xs" style={{ color: checklistPct === 100 ? '#16A34A' : 'var(--tp-text-2)' }}>
                <CheckSquare className="w-3 h-3" />
                <span>{checklistDone}/{checklistTotal} · {checklistPct}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Priority badge */}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
            {/* Assignees */}
            {user && (
              <div
                className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0', user.color)}
                title={user.name}
              >
                {user.initials?.[0]}
              </div>
            )}
            {extraAssignees > 0 && (
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-semibold shrink-0 bg-gray-400"
                title={`+${extraAssignees} responsable(s) más`}
              >
                +{extraAssignees}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
