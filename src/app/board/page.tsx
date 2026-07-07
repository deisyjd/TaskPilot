'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

function BoardPageContent() {
  const tasks = useTaskStore((s) => s.tasks)
  const tasksLoading = useTaskStore((s) => s.tasksLoading)
  const projects = useTaskStore((s) => s.projects).filter((p) => p.status !== 'inactive')
  const users = useUserStore((s) => s.users).filter((u) => u.status !== 'inactive')
  const searchParams = useSearchParams()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('pending')
  const [handledSharedId, setHandledSharedId] = useState<string | null>(null)
  const [sharedTaskNotFound, setSharedTaskNotFound] = useState(false)

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false
      if (assigneeFilter !== 'all' && !t.assigneeIds.includes(assigneeFilter)) return false
      return true
    })
  }, [tasks, search, projectFilter, assigneeFilter])

  const byStatus = useMemo(() => {
    return STATUSES.reduce<Record<TaskStatus, Task[]>>((acc, s) => {
      acc[s] = filtered.filter((t) => t.status === s)
      return acc
    }, {} as Record<TaskStatus, Task[]>)
  }, [filtered])

  const moveTask = useTaskStore((s) => s.moveTask)

  const openEdit = (task: Task) => { setSelectedTask(task); setModalOpen(true) }
  const openNew = (status: TaskStatus) => { setSelectedTask(null); setNewTaskStatus(status); setModalOpen(true) }
  const closeModal = () => {
    setModalOpen(false)
    setSelectedTask(null)
    if (searchParams.get('task')) router.replace('/board')
  }

  // Enlace compartido: /board?task=<id> abre esa tarea directamente.
  useEffect(() => {
    const sharedTaskId = searchParams.get('task')
    if (!sharedTaskId || sharedTaskId === handledSharedId) return

    const found = tasks.find((t) => t.id === sharedTaskId)
    if (found) {
      setSelectedTask(found)
      setModalOpen(true)
      setHandledSharedId(sharedTaskId)
    } else if (!tasksLoading && tasks.length > 0) {
      // Ya cargaron las tareas visibles y no está — no existe o no hay acceso.
      setSharedTaskNotFound(true)
      setHandledSharedId(sharedTaskId)
    }
  }, [searchParams, tasks, tasksLoading, handledSharedId])

  const handleDrop = (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status !== targetStatus) moveTask(taskId, targetStatus)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {sharedTaskNotFound && (
        <div
          className="px-4 py-2.5 rounded-xl text-xs font-medium"
          style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
        >
          El enlace que abriste no corresponde a ninguna tarea visible para ti.
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
        <div className="flex gap-2 flex-1 sm:contents">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
            <input
              placeholder="Buscar tarea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputBase, paddingLeft: '36px', width: '100%' }}
              className="sm:w-[220px]"
            />
          </div>

          <div className="relative flex-1 sm:flex-none">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
              style={{ ...inputBase, width: '100%', paddingRight: '28px', appearance: 'none', cursor: 'pointer' }}
              className="sm:w-[180px]">
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--tp-text-2)' }} />
          </div>

          <div className="relative flex-1 sm:flex-none">
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
              style={{ ...inputBase, width: '100%', paddingRight: '28px', appearance: 'none', cursor: 'pointer' }}
              className="sm:w-[160px]">
              <option value="all">Todos</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--tp-text-2)' }} />
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:ml-auto">
          <span className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
            {filtered.length} tareas
          </span>
          <button
            onClick={() => openNew('pending')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-88 ml-auto sm:ml-0"
            style={{ backgroundColor: 'var(--tp-dark)', color: '#FFFFFF', borderRadius: 'var(--tp-r-btn)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva tarea</span>
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-3.5 overflow-x-auto pb-4 flex-1 min-h-0">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={byStatus[status]}
            onCardClick={openEdit}
            onAddTask={openNew}
            onDrop={(taskId) => handleDrop(taskId, status)}
          />
        ))}
      </div>

      <TaskModal open={modalOpen} task={selectedTask} defaultStatus={newTaskStatus} onClose={closeModal} />
    </div>
  )
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="flex flex-col h-full gap-4" />}>
      <BoardPageContent />
    </Suspense>
  )
}
