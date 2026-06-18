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

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  pending: 'bg-gray-400',
  'in-progress': 'bg-blue-500',
  review: 'bg-amber-500',
  scheduled: 'bg-violet-500',
  done: 'bg-green-500',
  blocked: 'bg-red-500',
}

export function KanbanColumn({ status, tasks, onCardClick, onAddTask }: Props) {
  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full', COLUMN_ACCENT[status])} />
          <span className="text-sm font-semibold text-gray-700">{STATUS_LABELS[status]}</span>
          <span className="text-xs bg-gray-100 text-gray-500 font-medium px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          title="Nueva tarea"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1 min-h-[200px] rounded-xl bg-gray-50 p-2">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-gray-300">
            Sin tareas
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} />
          ))
        )}

        <button
          onClick={() => onAddTask(status)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-1 w-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva tarea
        </button>
      </div>
    </div>
  )
}
