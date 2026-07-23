'use client'

import { useState } from 'react'
import { Task } from '@/types'
import { TimelineCard } from './TimelineCard'
import { Plus } from 'lucide-react'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

interface Props {
  date: Date
  tasks: Task[]
  isToday: boolean
  onCardClick: (task: Task) => void
  onAddTask: (date: Date) => void
  onDropTask: (taskId: string, date: Date) => void
}

export function DayColumn({ date, tasks, isToday, onCardClick, onAddTask, onDropTask }: Props) {
  const dayName = DAY_NAMES[date.getDay()]
  const dayNum = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const done = tasks.filter((t) => t.status === 'done').length
  const active = tasks.filter((t) => t.status !== 'done').length
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="flex flex-col w-52 shrink-0" style={{ opacity: isWeekend ? 0.75 : 1 }}>
      {/* Day header */}
      <div
        className="rounded-2xl p-3 mb-2 text-center"
        style={{
          backgroundColor: isToday ? 'var(--tp-dark)' : 'var(--tp-surface)',
          border: isToday ? 'none' : '1px solid var(--tp-border)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: isToday ? 'rgba(255,255,255,0.5)' : 'var(--tp-text-2)' }}>
          {dayName}
        </p>
        <p className="text-3xl font-semibold leading-none mt-1" style={{ color: isToday ? 'var(--tp-lime)' : 'var(--tp-text)' }}>
          {dayNum}
        </p>
        <p className="text-xs mt-0.5" style={{ color: isToday ? 'rgba(255,255,255,0.4)' : 'var(--tp-text-2)' }}>
          {month}
        </p>
        {tasks.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs" style={{ color: isToday ? 'rgba(255,255,255,0.5)' : 'var(--tp-text-2)' }}>
            {active > 0 && <span>{active} act.</span>}
            {done > 0 && <span style={{ color: isToday ? 'var(--tp-lime)' : '#22C55E' }}>✓{done}</span>}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div
        className="flex flex-col gap-1.5 flex-1 p-1.5 min-h-[120px] transition-colors"
        style={{
          backgroundColor: dragOver ? 'rgba(163, 230, 53, 0.15)' : 'var(--tp-bg-2)',
          borderRadius: 'var(--tp-r-inner)',
          outline: dragOver ? '2px dashed var(--tp-lime)' : 'none',
          outlineOffset: '-2px',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const taskId = e.dataTransfer.getData('taskId')
          if (taskId) onDropTask(taskId, date)
        }}
      >
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs" style={{ color: 'var(--tp-text-2)', opacity: 0.4 }}>
            Sin tareas
          </div>
        )}
        {tasks.map((task) => (
          <TimelineCard key={task.id} task={task} onClick={() => onCardClick(task)} />
        ))}
        <button
          onClick={() => onAddTask(date)}
          className="flex items-center justify-center gap-1 text-xs py-2 rounded-xl transition-all hover:opacity-80 mt-auto"
          style={{ color: 'var(--tp-text-2)', backgroundColor: 'rgba(255,255,255,0.5)' }}
        >
          <Plus className="w-3 h-3" />
          Agregar
        </button>
      </div>
    </div>
  )
}
