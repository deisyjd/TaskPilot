'use client'

import { useMemo } from 'react'
import { Task, STATUS_DOT_COLORS, STATUS_LABELS, TaskStatus } from '@/types'
import { parseLocal } from '@/lib/dates'

interface Props {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

const DAY_MS = 86400000
const DAY_WIDTH = 28
const ROW_HEIGHT = 40
const LABEL_COL_WIDTH = 200

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function ProjectGantt({ tasks, onTaskClick }: Props) {
  const rows = useMemo(() => {
    return tasks
      .map((task) => {
        const due = parseLocal(task.dueDate)
        let start = task.startDate ? parseLocal(task.startDate) : due
        if (start > due) start = due
        return { task, start, due }
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [tasks])

  const { rangeStart, totalDays, todayOffset } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (rows.length === 0) {
      return { rangeStart: today, totalDays: 14, todayOffset: 0 }
    }

    let min = rows[0].start
    let max = rows[0].due
    for (const r of rows) {
      if (r.start < min) min = r.start
      if (r.due > max) max = r.due
    }
    if (min > today) min = today
    if (max < today) max = today

    const start = new Date(min)
    start.setDate(start.getDate() - 1)
    const end = new Date(max)
    end.setDate(end.getDate() + 2)

    return {
      rangeStart: start,
      totalDays: Math.max(daysBetween(start, end), 7),
      todayOffset: daysBetween(start, today),
    }
  }, [rows])

  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(rangeStart)
      d.setDate(d.getDate() + i)
      return d
    }),
    [rangeStart, totalDays]
  )

  if (rows.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: 'var(--tp-text-2)' }}>
        No hay tareas con fecha para mostrar en el cronograma.
      </p>
    )
  }

  const totalWidth = totalDays * DAY_WIDTH
  const statusesUsed = Array.from(new Set(rows.map((r) => r.task.status))) as TaskStatus[]

  return (
    <div>
      <div
        className="flex rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--tp-border)' }}
      >
        {/* Fixed label column */}
        <div className="shrink-0" style={{ width: LABEL_COL_WIDTH, borderRight: '1px solid var(--tp-border)' }}>
          <div
            className="flex items-center px-3 text-xs font-semibold"
            style={{ height: ROW_HEIGHT, backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text-2)' }}
          >
            Tarea
          </div>
          {rows.map(({ task }) => (
            <button
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="flex items-center gap-2 px-3 w-full text-left transition-colors hover:opacity-75"
              style={{ height: ROW_HEIGHT, borderTop: '1px solid var(--tp-border)' }}
              title={task.title}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLORS[task.status]}`} />
              <span className="text-xs truncate" style={{ color: 'var(--tp-text)' }}>{task.title}</span>
            </button>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div className="overflow-x-auto flex-1">
          <div style={{ width: totalWidth, position: 'relative' }}>
            {/* Header: week markers */}
            <div className="flex" style={{ height: ROW_HEIGHT, backgroundColor: 'var(--tp-bg)' }}>
              {days.map((d, i) => {
                const isWeekStart = d.getDay() === 1 || i === 0
                return (
                  <div
                    key={i}
                    className="shrink-0 flex items-center text-[10px] font-medium"
                    style={{
                      width: DAY_WIDTH,
                      color: 'var(--tp-text-2)',
                      borderLeft: isWeekStart ? '1px solid var(--tp-border)' : undefined,
                      paddingLeft: isWeekStart ? '4px' : 0,
                    }}
                  >
                    {isWeekStart ? `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}` : ''}
                  </div>
                )
              })}
            </div>

            {/* Rows */}
            {rows.map(({ task, start, due }) => {
              const left = daysBetween(rangeStart, start) * DAY_WIDTH
              const width = Math.max((daysBetween(start, due) + 1) * DAY_WIDTH - 4, DAY_WIDTH - 4)
              return (
                <div key={task.id} style={{ height: ROW_HEIGHT, position: 'relative', borderTop: '1px solid var(--tp-border)' }}>
                  <button
                    onClick={() => onTaskClick(task)}
                    className={`absolute flex items-center px-2 rounded-lg transition-opacity hover:opacity-85 ${STATUS_DOT_COLORS[task.status]}`}
                    style={{ left: left + 2, width, top: 6, height: ROW_HEIGHT - 12 }}
                    title={`${task.title} (${STATUS_LABELS[task.status]})`}
                  >
                    <span className="text-[11px] font-medium text-white truncate">{task.title}</span>
                  </button>
                </div>
              )
            })}

            {/* Today marker */}
            {todayOffset >= 0 && todayOffset < totalDays && (
              <div
                className="absolute top-0 bottom-0"
                style={{ left: todayOffset * DAY_WIDTH, width: '2px', backgroundColor: '#EF4444', opacity: 0.6 }}
                title="Hoy"
              />
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {statusesUsed.map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[status]}`} />
            <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
