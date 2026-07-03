import { create } from 'zustand'
import { useMemo } from 'react'
import { User, UserRole } from '@/types'
import { useAuthStore } from './useAuthStore'

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

interface UserStore {
  users: User[]
  loading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  addUser: (user: Partial<User>) => Promise<User | null>
  updateUser: (id: string, updates: Partial<User>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  deactivateUser: (id: string) => Promise<void>
  activateUser: (id: string) => Promise<void>
}

export const useUserStore = create<UserStore>()((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null })
    try {
      const users = await api<User[]>('/api/users')
      set({ users })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al cargar usuarios' })
    } finally {
      set({ loading: false })
    }
  },

  addUser: async (user) => {
    try {
      const created = await api<User>('/api/users', { method: 'POST', body: JSON.stringify(user) })
      set((s) => ({ users: [...s.users, created] }))
      return created
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al crear usuario' })
      return null
    }
  },

  updateUser: async (id, updates) => {
    try {
      const updated = await api<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      set((s) => ({ users: s.users.map((u) => (u.id === id ? updated : u)) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al actualizar usuario' })
    }
  },

  deleteUser: async (id) => {
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' })
      set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al eliminar usuario' })
    }
  },

  deactivateUser: async (id) => {
    await get().updateUser(id, { status: 'inactive' })
  },

  activateUser: async (id) => {
    await get().updateUser(id, { status: 'active' })
  },
}))

export function useCurrentUser(): User | null {
  const authUser = useAuthStore((s) => s.user)
  return useMemo(() => {
    if (!authUser) return null
    return {
      id: authUser.id,
      name: authUser.name,
      role: authUser.role,
      initials: authUser.initials,
      color: authUser.color,
      email: authUser.email,
      userRole: authUser.userRole as UserRole,
      avatarUrl: authUser.avatarUrl ?? undefined,
      status: 'active',
    }
  }, [authUser])
}
