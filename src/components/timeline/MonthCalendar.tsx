'use client'

import { useState, useMemo } from 'react'
import { Task } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { isOverdue } from '@/lib/dates'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function parseTaskDate(dueDate: string): Date {
  if (dueDate.includes('T')) return new Date(dueDate)
  const [y, m, d] = dueDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

interface Props {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: (date: Date) => void
}

const MAX_VISIBLE = 3

export function MonthCalendar({ tasks, onTaskClick, onAddTask }: Props) {
  const projects = useTaskStore((s) => s.projects)

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const firstDow = (firstDay.getDay() + 6) % 7 // Mon=0 … Sun=6
    const start = new Date(year, month, 1 - firstDow)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const isCurrentPeriod = month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="flex flex-col flex-1 gap-3 min-h-0">
      {/* Month nav */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm"
          style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
        >
          <button
            onClick={prevMonth}
            className="p-0.5 rounded transition-colors hover:opacity-70"
            style={{ color: 'var(--tp-text-2)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="text-sm font-medium min-w-[180px] text-center"
            style={{ color: 'var(--tp-text)' }}
          >
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-0.5 rounded transition-colors hover:opacity-70"
            style={{ color: 'var(--tp-text-2)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!isCurrentPeriod && (
          <button
            onClick={goToday}
            className="text-xs hover:underline"
            style={{ color: 'var(--tp-accent, #7c3aed)' }}
          >
            Mes actual
          </button>
        )}

        {/* Month summary */}
        <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: 'var(--tp-text-2)' }}>
          <span>{tasks.length} tareas en vista</span>
          {tasks.filter((t) => isOverdue(t.dueDate, t.status)).length > 0 && (
            <span style={{ color: '#EF4444' }}>
              ⚠ {tasks.filter((t) => isOverdue(t.dueDate, t.status)).length} vencidas
            </span>
          )}
          {tasks.filter((t) => t.status === 'done').length > 0 && (
            <span style={{ color: '#22C55E' }}>
              ✓ {tasks.filter((t) => t.status === 'done').length} listas
            </span>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
        }}
      >
        {/* Day headers */}
        <div
          className="grid grid-cols-7 shrink-0"
          style={{ borderBottom: '1px solid var(--tp-border)' }}
        >
          {DAY_HEADERS.map((d, i) => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-semibold uppercase tracking-widest"
              style={{
                color: 'var(--tp-text-2)',
                borderRight: i < 6 ? '1px solid var(--tp-border)' : undefined,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 6-week grid */}
        <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
          {calendarDays.map((day, i) => {
            const inMonth = day.getMonth() === month
            const isToday = sameDay(day, today)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            const dayTasks = tasks.filter((t) => sameDay(parseTaskDate(t.dueDate), day))
            const visible = dayTasks.slice(0, MAX_VISIBLE)
            const overflow = dayTasks.length - MAX_VISIBLE

            const col = i % 7
            const row = Math.floor(i / 7)

            return (
              <div
                key={i}
                className="group relative p-1.5 flex flex-col gap-0.5 overflow-hidden"
                style={{
                  borderRight: col < 6 ? '1px solid var(--tp-border)' : undefined,
                  borderBottom: row < 5 ? '1px solid var(--tp-border)' : undefined,
                  backgroundColor: isToday
                    ? 'rgba(163, 230, 53, 0.1)'
                    : isWeekend
                    ? 'var(--tp-bg)'
                    : undefined,
                  opacity: inMonth ? 1 : 0.35,
                }}
              >
                {/* Day number + add button */}
                <div className="flex items-center justify-between shrink-0">
                  <span
                    className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isToday ? 'var(--tp-dark)' : 'transparent',
                      color: isToday ? 'var(--tp-lime)' : 'var(--tp-text)',
                    }}
                  >
                    {day.getDate()}
                  </span>
                  <button
                    onClick={() => onAddTask(day)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                    style={{ color: 'var(--tp-text-2)' }}
                    title="Nueva tarea"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Task pills */}
                <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                  {visible.map((task) => {
                    const proj = projects.find((p) => p.name === task.project)
                    const overdue = isOverdue(task.dueDate, task.status)
                    const done = task.status === 'done'

                    return (
                      <button
                        key={task.id}
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task) }}
                        className="text-left text-xs px-1.5 py-px rounded truncate w-full transition-opacity hover:opacity-75"
                        title={task.title}
                        style={{
                          backgroundColor: done
                            ? 'var(--tp-bg-2)'
                            : overdue
                            ? '#FEE2E2'
                            : proj
                            ? proj.color + '28'
                            : 'var(--tp-bg)',
                          borderLeft: `2px solid ${
                            done ? 'var(--tp-border)' : overdue ? '#FCA5A5' : proj?.color ?? '#94a3b8'
                          }`,
                          color: done ? 'var(--tp-text-2)' : overdue ? '#DC2626' : 'var(--tp-text)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </button>
                    )
                  })}
                  {overflow > 0 && (
                    <span
                      className="text-xs px-1.5"
                      style={{ color: 'var(--tp-text-2)' }}
                    >
                      +{overflow} más
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
