'use client'

import { Task, TaskStatus, STATUS_LABELS, STATUS_DOT_COLORS } from '@/types'
import { TaskCard } from './TaskCard'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface Props {
  status: TaskStatus
  tasks: Task[]
  onCardClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}

const STATUS_BG: Record<TaskStatus, string> = {
  pending:      'rgba(156,163,175,0.15)',
  'in-progress':'rgba(59,130,246,0.08)',
  review:       'rgba(245,158,11,0.08)',
  scheduled:    'rgba(139,92,246,0.08)',
  done:         'rgba(34,197,94,0.08)',
  blocked:      'rgba(239,68,68,0.08)',
}

const DOT_COLORS: Record<TaskStatus, string> = {
  pending:      '#9CA3AF',
  'in-progress':'#3B82F6',
  review:       '#F59E0B',
  scheduled:    '#8B5CF6',
  done:         '#22C55E',
  blocked:      '#EF4444',
}

export function KanbanColumn({ status, tasks, onCardClick, onAddTask }: Props) {
  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DOT_COLORS[status] }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--tp-text)' }}>{STATUS_LABELS[status]}</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: STATUS_BG[status], color: DOT_COLORS[status] }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1.5 rounded-xl transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
          title="Nueva tarea"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Column body */}
      <div
        className="flex flex-col gap-2 flex-1 min-h-[200px] p-2.5"
        style={{ backgroundColor: STATUS_BG[status], borderRadius: 'var(--tp-r-inner)' }}
      >
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--tp-text-2)', opacity: 0.5 }}>
            Sin tareas
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} />
        ))}

        <button
          onClick={() => onAddTask(status)}
          className="flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl transition-all hover:opacity-80 mt-1"
          style={{ color: 'var(--tp-text-2)', backgroundColor: 'rgba(255,255,255,0.6)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir tarea
        </button>
      </div>
    </div>
  )
}
