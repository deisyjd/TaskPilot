import { create } from 'zustand'
import { Task, TaskStatus, HistoryEvent, Project, Note, Reminder } from '@/types'

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Solicitud fallida (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

interface TaskStore {
  tasks: Task[]
  history: HistoryEvent[]
  projects: Project[]
  reminders: Reminder[]
  tasksLoading: boolean
  projectsLoading: boolean
  historyLoading: boolean
  remindersLoading: boolean
  error: string | null

  fetchTasks: () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchHistory: () => Promise<void>
  fetchReminders: () => Promise<void>
  fetchAll: () => Promise<void>

  addTask: (task: Partial<Task> & { title: string; projectId: string }) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  moveTask: (id: string, status: TaskStatus) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  duplicateTask: (id: string) => Promise<Task | null>

  addProject: (project: Partial<Project> & { name: string; memberIds?: string[] }) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<Project> & { memberIds?: string[] }) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  restoreProject: (id: string) => Promise<void>

  addNote: (projectId: string, note: { title?: string; content?: string; color?: string }) => Promise<Note | null>
  updateNote: (id: string, updates: { title?: string; content?: string; color?: string }) => Promise<boolean>
  deleteNote: (id: string) => Promise<boolean>

  addReminder: (reminder: { projectId: string; title: string; dueDate: string; assigneeId?: string | null }) => Promise<Reminder | null>
  updateReminder: (id: string, updates: Partial<Pick<Reminder, 'title' | 'dueDate' | 'done' | 'assigneeId'>>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>

  getProjectById: (id: string) => Project | undefined
}

function replaceProjectNotes(projects: Project[], noteId: string, apply: (notes: Note[]) => Note[]) {
  return projects.map((p) => (p.notes?.some((n) => n.id === noteId) ? { ...p, notes: apply(p.notes ?? []) } : p))
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  history: [],
  projects: [],
  reminders: [],
  tasksLoading: false,
  projectsLoading: false,
  historyLoading: false,
  remindersLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ tasksLoading: true, error: null })
    try {
      const tasks = await api<Task[]>('/api/tasks')
      set({ tasks })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al cargar tareas' })
    } finally {
      set({ tasksLoading: false })
    }
  },

  fetchProjects: async () => {
    set({ projectsLoading: true, error: null })
    try {
      const projects = await api<Project[]>('/api/projects')
      set({ projects })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al cargar proyectos' })
    } finally {
      set({ projectsLoading: false })
    }
  },

  fetchHistory: async () => {
    set({ historyLoading: true, error: null })
    try {
      const history = await api<HistoryEvent[]>('/api/history')
      set({ history })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al cargar historial' })
    } finally {
      set({ historyLoading: false })
    }
  },

  fetchReminders: async () => {
    set({ remindersLoading: true, error: null })
    try {
      const reminders = await api<Reminder[]>('/api/reminders')
      set({ reminders })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al cargar recordatorios' })
    } finally {
      set({ remindersLoading: false })
    }
  },

  fetchAll: async () => {
    await Promise.all([get().fetchProjects(), get().fetchTasks(), get().fetchHistory(), get().fetchReminders()])
  },

  addTask: async (task) => {
    try {
      const created = await api<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(task) })
      set((s) => ({ tasks: [created, ...s.tasks] }))
      get().fetchHistory()
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al crear tarea' })
      return null
    }
  },

  updateTask: async (id, updates) => {
    try {
      const updated = await api<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
      get().fetchHistory()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al actualizar tarea' })
    }
  },

  moveTask: async (id, status) => {
    await get().updateTask(id, { status })
  },

  deleteTask: async (id) => {
    try {
      await api(`/api/tasks/${id}`, { method: 'DELETE' })
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al eliminar tarea' })
    }
  },

  duplicateTask: async (id) => {
    try {
      const created = await api<Task>(`/api/tasks/${id}/duplicate`, { method: 'POST' })
      set((s) => ({ tasks: [created, ...s.tasks] }))
      get().fetchHistory()
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al duplicar tarea' })
      return null
    }
  },

  addProject: async (project) => {
    try {
      const created = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify(project) })
      set((s) => ({ projects: [...s.projects, created] }))
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al crear proyecto' })
      return null
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updated = await api<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      set((s) => ({ projects: s.projects.map((p) => (p.id === id ? updated : p)) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al actualizar proyecto' })
    }
  },

  deleteProject: async (id) => {
    try {
      await api(`/api/projects/${id}`, { method: 'DELETE' })
      set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al eliminar proyecto' })
    }
  },

  archiveProject: async (id) => {
    await get().updateProject(id, { status: 'inactive', featured: false })
  },

  restoreProject: async (id) => {
    await get().updateProject(id, { status: 'active' })
  },

  addNote: async (projectId, note) => {
    try {
      const created = await api<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ projectId, ...note }) })
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, notes: [created, ...(p.notes ?? [])] } : p
        ),
      }))
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al crear nota' })
      return null
    }
  },

  updateNote: async (id, updates) => {
    try {
      const updated = await api<Note>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      set((s) => ({ projects: replaceProjectNotes(s.projects, id, (notes) => notes.map((n) => (n.id === id ? updated : n))) }))
      return true
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al actualizar nota' })
      return false
    }
  },

  deleteNote: async (id) => {
    try {
      await api(`/api/notes/${id}`, { method: 'DELETE' })
      set((s) => ({ projects: replaceProjectNotes(s.projects, id, (notes) => notes.filter((n) => n.id !== id)) }))
      return true
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al eliminar nota' })
      return false
    }
  },

  addReminder: async (reminder) => {
    try {
      const created = await api<Reminder>('/api/reminders', { method: 'POST', body: JSON.stringify(reminder) })
      set((s) => ({ reminders: [...s.reminders, created].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }))
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al crear recordatorio' })
      return null
    }
  },

  updateReminder: async (id, updates) => {
    try {
      const updated = await api<Reminder>(`/api/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? updated : r)) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al actualizar recordatorio' })
    }
  },

  deleteReminder: async (id) => {
    try {
      await api(`/api/reminders/${id}`, { method: 'DELETE' })
      set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al eliminar recordatorio' })
    }
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),
}))
