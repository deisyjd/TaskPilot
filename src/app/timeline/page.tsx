'use client'

import { useState, useMemo } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { Task, TaskStatus } from '@/types'
import { PROJECT_NAMES } from '@/data/projects'
import { isSameDay } from '@/lib/dates'
import { DayColumn } from '@/components/timeline/DayColumn'
import { TaskModal } from '@/components/board/TaskModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function getWeekStart(offset: number): Date {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

export default function TimelinePage() {
  const tasks = useTaskStore((s) => s.tasks)

  const [weekOffset, setWeekOffset] = useState(0)
  const [projectFilter, setProjectFilter] = useState('all')
  const [showDone, setShowDone] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('pending')
  const [newTaskDate, setNewTaskDate] = useState<string>('')

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset])
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekEnd = weekDays[6]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter !== 'all' && t.project !== projectFilter) return false
      if (!showDone && t.status === 'done') return false
      const d = new Date(t.dueDate)
      d.setHours(0, 0, 0, 0)
      return d >= weekStart && d <= weekEnd
    })
  }, [tasks, projectFilter, showDone, weekStart, weekEnd])

  const tasksByDay = useMemo(() => {
    return weekDays.map((day) => ({
      date: day,
      tasks: filtered.filter((t) => isSameDay(new Date(t.dueDate), day)),
    }))
  }, [weekDays, filtered])

  const weekLabel = (() => {
    const s = weekDays[0]
    const e = weekDays[6]
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} de ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`
    }
    return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`
  })()

  const totalThisWeek = filtered.length
  const doneThisWeek = filtered.filter((t) => t.status === 'done').length
  const overdueThisWeek = filtered.filter((t) => {
    const d = new Date(t.dueDate); d.setHours(0,0,0,0)
    return d < today && t.status !== 'done'
  }).length

  const openEdit = (task: Task) => {
    setSelectedTask(task)
    setModalOpen(true)
  }

  const openNew = (date: Date) => {
    setSelectedTask(null)
    setNewTaskDate(date.toISOString().split('T')[0])
    setNewTaskStatus('pending')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedTask(null)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Week navigation */}
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5 shadow-sm">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium text-gray-700 min-w-[220px] text-center">
              {weekLabel}
            </span>
          </div>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs text-violet-600 hover:underline"
          >
            Semana actual
          </button>
        )}

        <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v ?? 'all')}>
          <SelectTrigger className="w-44 h-9 bg-white text-sm">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {PROJECT_NAMES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={() => setShowDone((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            showDone
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-white border-gray-100 text-gray-400'
          }`}
        >
          {showDone ? '✓ Completadas visibles' : 'Ocultar completadas'}
        </button>

        {/* Weekly stats */}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span>{totalThisWeek} tareas</span>
          {doneThisWeek > 0 && <span className="text-green-500">✓ {doneThisWeek} listas</span>}
          {overdueThisWeek > 0 && <span className="text-red-400">⚠ {overdueThisWeek} vencidas</span>}
        </div>
      </div>

      {/* Timeline grid */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
        {tasksByDay.map(({ date, tasks: dayTasks }) => (
          <DayColumn
            key={date.toISOString()}
            date={date}
            tasks={dayTasks}
            isToday={isSameDay(date, today)}
            onCardClick={openEdit}
            onAddTask={openNew}
          />
        ))}
      </div>

      {/* Task modal */}
      <TaskModal
        open={modalOpen}
        task={selectedTask}
        defaultStatus={newTaskStatus}
        onClose={closeModal}
      />
    </div>
  )
}
