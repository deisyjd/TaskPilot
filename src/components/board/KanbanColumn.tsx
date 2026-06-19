'use client'

import { useRef, useState } from 'react'
import { Task, TaskStatus, STATUS_LABELS } from '@/types'
import { TaskCard } from './TaskCard'
import { Plus } from 'lucide-react'

interface Props {
  status: TaskStatus
  tasks: Task[]
  onCardClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
  onDrop: (taskId: string) => void
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

export function KanbanColumn({ status, tasks, onCardClick, onAddTask, onDrop }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  // Counter to correctly handle dragenter/dragleave on child elements
  const dragCounter = useRef(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) onDrop(taskId)
  }

  const accent = DOT_COLORS[status]

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--tp-text)' }}>
            {STATUS_LABELS[status]}
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full transition-all"
            style={{
              backgroundColor: isDragOver ? accent + '30' : STATUS_BG[status],
              color: accent,
            }}
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

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex flex-col gap-2 flex-1 min-h-[200px] p-2.5 transition-all"
        style={{
          backgroundColor: isDragOver ? accent + '18' : STATUS_BG[status],
          borderRadius: 'var(--tp-r-inner)',
          border: isDragOver ? `2px dashed ${accent}` : '2px solid transparent',
          transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        {tasks.length === 0 && !isDragOver && (
          <div
            className="flex items-center justify-center h-20 text-xs"
            style={{ color: 'var(--tp-text-2)', opacity: 0.5 }}
          >
            Sin tareas
          </div>
        )}

        {isDragOver && tasks.length === 0 && (
          <div
            className="flex items-center justify-center h-20 text-xs font-medium rounded-xl"
            style={{ color: accent, border: `1px dashed ${accent}`, opacity: 0.7 }}
          >
            Soltar aquí
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
