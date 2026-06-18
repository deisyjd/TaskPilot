'use client'

import { useState, useMemo } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { Task, TaskStatus } from '@/types'
import { PROJECT_NAMES } from '@/data/projects'
import { USER_NAMES } from '@/data/users'
import { KanbanColumn } from '@/components/board/KanbanColumn'
import { TaskModal } from '@/components/board/TaskModal'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'

const STATUSES: TaskStatus[] = [
  'pending',
  'in-progress',
  'review',
  'scheduled',
  'done',
  'blocked',
]

export default function BoardPage() {
  const tasks = useTaskStore((s) => s.tasks)

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
    return STATUSES.reduce<Record<TaskStatus, Task[]>>(
      (acc, s) => {
        acc[s] = filtered.filter((t) => t.status === s)
        return acc
      },
      {} as Record<TaskStatus, Task[]>
    )
  }, [filtered])

  const openEdit = (task: Task) => {
    setSelectedTask(task)
    setModalOpen(true)
  }

  const openNew = (status: TaskStatus) => {
    setSelectedTask(null)
    setNewTaskStatus(status)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedTask(null)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar tarea..."
            className="pl-9 bg-white h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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

        <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v ?? 'all')}>
          <SelectTrigger className="w-40 h-9 bg-white text-sm">
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {USER_NAMES.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{filtered.length} tareas</span>
          </div>
          <Button
            size="sm"
            onClick={() => openNew('pending')}
            className="bg-violet-600 hover:bg-violet-700 text-white h-9"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva tarea
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
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
