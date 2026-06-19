'use client'

import { useState, useMemo } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { Task, TaskStatus } from '@/types'
import { KanbanColumn } from '@/components/board/KanbanColumn'
import { TaskModal } from '@/components/board/TaskModal'
import { Search, SlidersHorizontal, Plus, ChevronDown } from 'lucide-react'

const STATUSES: TaskStatus[] = ['pending', 'in-progress', 'review', 'scheduled', 'done', 'blocked']

const inputBase: React.CSSProperties = {
  borderRadius: 'var(--tp-r-input)',
  border: '1px solid var(--tp-border)',
  backgroundColor: 'var(--tp-surface)',
  color: 'var(--tp-text)',
  fontSize: '13px',
  height: '36px',
  padding: '0 12px',
  outline: 'none',
}

export default function BoardPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useTaskStore((s) => s.projects)
  const users = useUserStore((s) => s.users).filter((u) => u.status !== 'inactive')

  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('pending')

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (projectFilter !== 'all' && t.project !== projectFilter) return false
      if (assigneeFilter !== 'all' && t.assignee !== assigneeFilter) return false
      return true
    })
  }, [tasks, search, projectFilter, assigneeFilter])

  const byStatus = useMemo(() => {
    return STATUSES.reduce<Record<TaskStatus, Task[]>>((acc, s) => {
      acc[s] = filtered.filter((t) => t.status === s)
      return acc
    }, {} as Record<TaskStatus, Task[]>)
  }, [filtered])

  const openEdit = (task: Task) => { setSelectedTask(task); setModalOpen(true) }
  const openNew = (status: TaskStatus) => { setSelectedTask(null); setNewTaskStatus(status); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setSelectedTask(null) }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
          <input
            placeholder="Buscar tarea..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, paddingLeft: '36px', width: '220px' }}
          />
        </div>

        <div className="relative">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            style={{ ...inputBase, width: '180px', paddingRight: '28px', appearance: 'none', cursor: 'pointer' }}>
            <option value="all">Todos los proyectos</option>
            {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--tp-text-2)' }} />
        </div>

        <div className="relative">
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
            style={{ ...inputBase, width: '160px', paddingRight: '28px', appearance: 'none', cursor: 'pointer' }}>
            <option value="all">Todos</option>
            {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--tp-text-2)' }} />
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
            {filtered.length} tareas
          </span>
          <button
            onClick={() => openNew('pending')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-88"
            style={{ backgroundColor: 'var(--tp-dark)', color: '#FFFFFF', borderRadius: 'var(--tp-r-btn)' }}
          >
            <Plus className="w-4 h-4" />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-3.5 overflow-x-auto pb-4 flex-1">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={byStatus[status]}
            onCardClick={openEdit}
            onAddTask={openNew}
          />
        ))}
      </div>

      <TaskModal open={modalOpen} task={selectedTask} defaultStatus={newTaskStatus} onClose={closeModal} />
    </div>
  )
}
