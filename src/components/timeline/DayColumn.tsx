'use client'

import { Task } from '@/types'
import { TimelineCard } from './TimelineCard'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

interface Props {
  date: Date
  tasks: Task[]
  isToday: boolean
  onCardClick: (task: Task) => void
  onAddTask: (date: Date) => void
}

export function DayColumn({ date, tasks, isToday, onCardClick, onAddTask }: Props) {
  const dayName = DAY_NAMES[date.getDay()]
  const dayNum = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]
  const isWeekend = date.getDay() === 0 || date.getDay() === 6

  const done = tasks.filter((t) => t.status === 'done').length
  const active = tasks.filter((t) => t.status !== 'done').length

  return (
    <div className={cn('flex flex-col w-52 shrink-0', isWeekend && 'opacity-80')}>
      {/* Day header */}
      <div
        className={cn(
          'rounded-xl p-3 mb-2 text-center',
          isToday ? 'bg-violet-600 text-white' : 'bg-white border border-gray-100'
        )}
      >
        <p className={cn('text-xs font-medium uppercase tracking-wide', isToday ? 'text-violet-200' : 'text-gray-400')}>
          {dayName}
        </p>
        <p className={cn('text-2xl font-bold leading-none mt-1', isToday ? 'text-white' : 'text-gray-900')}>
          {dayNum}
        </p>
        <p className={cn('text-xs mt-0.5', isToday ? 'text-violet-200' : 'text-gray-400')}>
          {month}
        </p>
        {tasks.length > 0 && (
          <div className={cn('flex items-center justify-center gap-2 mt-2 text-xs', isToday ? 'text-violet-200' : 'text-gray-400')}>
            {active > 0 && <span>{active} pend.</span>}
            {done > 0 && <span className={isToday ? 'text-violet-100' : 'text-green-500'}>✓ {done}</span>}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-1.5 flex-1 bg-gray-50/60 rounded-xl p-1.5 min-h-[120px]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-gray-300">
            Sin tareas
          </div>
        ) : (
          tasks.map((task) => (
            <TimelineCard key={task.id} task={task} onClick={() => onCardClick(task)} />
          ))
        )}
        <button
          onClick={() => onAddTask(date)}
          className="flex items-center justify-center gap-1 text-xs text-gray-300 hover:text-gray-500 py-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-auto"
        >
          <Plus className="w-3 h-3" />
          Agregar
        </button>
      </div>
    </div>
  )
}
