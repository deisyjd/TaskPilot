import { create } from 'zustand'
import { Task, TaskStatus, HistoryEvent, HistoryEventType } from '@/types'
import { MOCK_TASKS } from '@/data/tasks'
import { MOCK_HISTORY } from '@/data/history'

function newHistoryEvent(
  type: HistoryEventType,
  task: Task,
  description: string,
  meta?: Record<string, string>
): HistoryEvent {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    taskId: task.id,
    taskTitle: task.title,
    project: task.project,
    description,
    user: 'Deisy',
    timestamp: new Date().toISOString(),
    meta,
  }
}

interface TaskStore {
  tasks: Task[]
  history: HistoryEvent[]
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  moveTask: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: MOCK_TASKS,
  history: MOCK_HISTORY,

  addTask: (task) => {
    const event = newHistoryEvent('task-created', task, 'Tarea creada')
    set((s) => ({ tasks: [...s.tasks, task], history: [event, ...s.history] }))
  },

  updateTask: (id, updates) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const updated = { ...task, ...updates, updatedAt: new Date().toISOString() }
    const events: HistoryEvent[] = []

    if (updates.status && updates.status !== task.status) {
      events.push(
        newHistoryEvent(
          updates.status === 'done' ? 'task-completed' : 'status-changed',
          updated,
          `Estado cambiado de ${task.status} a ${updates.status}`,
          { from: task.status, to: updates.status }
        )
      )
    }
    if (updates.assignee && updates.assignee !== task.assignee) {
      events.push(
        newHistoryEvent('assignee-changed', updated, `Responsable cambiado a ${updates.assignee}`, {
          from: task.assignee,
          to: updates.assignee,
        })
      )
    }
    if (updates.dueDate && updates.dueDate !== task.dueDate) {
      events.push(
        newHistoryEvent('date-changed', updated, `Fecha límite actualizada`, {
          from: task.dueDate,
          to: updates.dueDate,
        })
      )
    }
    if (events.length === 0) {
      events.push(newHistoryEvent('task-edited', updated, 'Tarea editada'))
    }

    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      history: [...events, ...s.history],
    }))
  },

  moveTask: (id, status) => {
    get().updateTask(id, { status })
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },
}))
