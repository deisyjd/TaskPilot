'use client'

import { useState, useMemo } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore, useCurrentUser } from '@/store/useUserStore'
import { Task, TaskStatus } from '@/types'
import { isSameDay, formatDateOnly } from '@/lib/dates'
import { DayColumn } from '@/components/timeline/DayColumn'
import { MonthCalendar } from '@/components/timeline/MonthCalendar'
import { TaskModal } from '@/components/board/TaskModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid } from 'lucide-react'

type ViewMode = 'week' | 'month'

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
  const updateTask = useTaskStore((s) => s.updateTask)
  const projects = useTaskStore((s) => s.projects).filter((p) => p.status !== 'inactive')
  const users = useUserStore((s) => s.users).filter((u) => u.status !== 'inactive')
  const currentUser = useCurrentUser()

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [projectFilter, setProjectFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'editor' | 'viewer'>('all')
  const [showDone, setShowDone] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newTaskStatus] = useState<TaskStatus>('pending')
  const [newTaskDate, setNewTaskDate] = useState<string>('')

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset])
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekEnd = weekDays[6]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Base filter (project + done): applied to both views
  // Week view also filters by date range; month view passes all to MonthCalendar
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false
      if (assigneeFilter !== 'all' && !t.assigneeIds.includes(assigneeFilter)) return false
      if (roleFilter !== 'all' && currentUser) {
        const isAssignee = t.assigneeIds.includes(currentUser.id)
        const isViewerOnTask = t.viewerAssigneeIds?.includes(currentUser.id) ?? false
        if (roleFilter === 'editor' && (!isAssignee || isViewerOnTask)) return false
        if (roleFilter === 'viewer' && (!isAssignee || !isViewerOnTask)) return false
      }
      if (!showDone && t.status === 'done') return false
      if (viewMode === 'week') {
        const [y, m, d] = t.dueDate.split('T')[0].split('-').map(Number)
        const td = new Date(y, m - 1, d)
        td.setHours(0, 0, 0, 0)
        return td >= weekStart && td <= weekEnd
      }
      return true
    })
  }, [tasks, projectFilter, assigneeFilter, roleFilter, currentUser, showDone, viewMode, weekStart, weekEnd])

  const tasksByDay = useMemo(() => {
    return weekDays.map((day) => ({
      date: day,
      tasks: filtered.filter((t) => {
        const [y, m, d] = t.dueDate.split('T')[0].split('-').map(Number)
        return isSameDay(new Date(y, m - 1, d), day)
      }),
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
    const [y, m, d] = t.dueDate.split('T')[0].split('-').map(Number)
    const td = new Date(y, m - 1, d); td.setHours(0,0,0,0)
    return td < today && t.status !== 'done'
  }).length

  const openEdit = (task: Task) => { setSelectedTask(task); setModalOpen(true) }

  const openNew = (date: Date) => {
    setSelectedTask(null)
    setNewTaskDate(formatDateOnly(date))
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setSelectedTask(null) }

  const handleDropTask = (taskId: string, date: Date) => {
    const task = tasks.find((t) => t.id === taskId)
    const newDueDate = formatDateOnly(date)
    if (task && task.dueDate !== newDueDate) updateTask(taskId, { dueDate: newDueDate })
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
        >
          <button
            onClick={() => setViewMode('week')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{
              backgroundColor: viewMode === 'week' ? 'var(--tp-dark)' : 'transparent',
              color: viewMode === 'week' ? 'var(--tp-lime)' : 'var(--tp-text-2)',
            }}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Semana
          </button>
          <button
            onClick={() => setViewMode('month')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{
              backgroundColor: viewMode === 'month' ? 'var(--tp-dark)' : 'transparent',
              color: viewMode === 'month' ? 'var(--tp-lime)' : 'var(--tp-text-2)',
            }}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Mes
          </button>
        </div>

        {/* Week navigation (only in week view) */}
        {viewMode === 'week' && (
          <>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm"
              style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
            >
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="p-0.5 rounded transition-colors hover:opacity-70"
                style={{ color: 'var(--tp-text-2)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span
                className="text-sm font-medium min-w-[220px] text-center"
                style={{ color: 'var(--tp-text)' }}
              >
                {weekLabel}
              </span>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-0.5 rounded transition-colors hover:opacity-70"
                style={{ color: 'var(--tp-text-2)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs hover:underline"
                style={{ color: 'var(--tp-accent, #7c3aed)' }}
              >
                Semana actual
              </button>
            )}
          </>
        )}

        {/* Project filter */}
        <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v ?? 'all')}>
          <SelectTrigger className="w-44 h-9 bg-white text-sm">
            <SelectValue placeholder="Proyecto">
              {(v: string) => (v === 'all' ? 'Todos los proyectos' : projects.find((p) => p.id === v)?.name ?? 'Proyecto')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee filter */}
        <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v ?? 'all')}>
          <SelectTrigger className="w-52 h-9 bg-white text-sm">
            <SelectValue placeholder="Responsable">
              {(v: string) => (v === 'all' ? 'Todos los responsables' : users.find((u) => u.id === v)?.name ?? 'Responsable')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los responsables</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mi rol en la tarea: propias (editar) vs. solo auditoría (ver) */}
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter((v as typeof roleFilter) ?? 'all')}>
          <SelectTrigger className="w-48 h-9 bg-white text-sm">
            <SelectValue placeholder="Mi rol">
              {(v: string) =>
                v === 'editor' ? 'Propias (editar)' : v === 'viewer' ? 'Solo auditoría (ver)' : 'Todas (mi rol)'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas (mi rol)</SelectItem>
            <SelectItem value="editor">Propias (editar)</SelectItem>
            <SelectItem value="viewer">Solo auditoría (ver)</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setShowDone((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{
            backgroundColor: showDone ? '#F0FDF4' : 'var(--tp-surface)',
            borderColor: showDone ? '#BBF7D0' : 'var(--tp-border)',
            color: showDone ? '#15803D' : 'var(--tp-text-2)',
          }}
        >
          {showDone ? '✓ Completadas visibles' : 'Ocultar completadas'}
        </button>

        {/* Week stats (only in week view) */}
        {viewMode === 'week' && (
          <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: 'var(--tp-text-2)' }}>
            <span>{totalThisWeek} tareas</span>
            {doneThisWeek > 0 && <span style={{ color: '#22C55E' }}>✓ {doneThisWeek} listas</span>}
            {overdueThisWeek > 0 && <span style={{ color: '#F87171' }}>⚠ {overdueThisWeek} vencidas</span>}
          </div>
        )}
      </div>

      {/* Week view */}
      {viewMode === 'week' && (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
          {tasksByDay.map(({ date, tasks: dayTasks }) => (
            <DayColumn
              key={date.toISOString()}
              date={date}
              tasks={dayTasks}
              isToday={isSameDay(date, today)}
              onCardClick={openEdit}
              onAddTask={openNew}
              onDropTask={handleDropTask}
            />
          ))}
        </div>
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <MonthCalendar
          tasks={filtered}
          onTaskClick={openEdit}
          onAddTask={openNew}
          onDropTask={handleDropTask}
        />
      )}

      {/* Task modal */}
      <TaskModal
        open={modalOpen}
        task={selectedTask}
        defaultStatus={newTaskStatus}
        defaultDueDate={newTaskDate}
        onClose={closeModal}
      />
    </div>
  )
}
