import { create } from 'zustand'
import { Task, TaskStatus, HistoryEvent, Project } from '@/types'

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
  tasksLoading: boolean
  projectsLoading: boolean
  historyLoading: boolean
  error: string | null

  fetchTasks: () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchHistory: () => Promise<void>
  fetchAll: () => Promise<void>

  addTask: (task: Partial<Task> & { title: string; projectId: string }) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  moveTask: (id: string, status: TaskStatus) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  addProject: (project: Partial<Project> & { name: string }) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  restoreProject: (id: string) => Promise<void>

  getProjectById: (id: string) => Project | undefined
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  history: [],
  projects: [],
  tasksLoading: false,
  projectsLoading: false,
  historyLoading: false,
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

  fetchAll: async () => {
    await Promise.all([get().fetchProjects(), get().fetchTasks(), get().fetchHistory()])
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

  getProjectById: (id) => get().projects.find((p) => p.id === id),
}))
