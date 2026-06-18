import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole, UserStatus } from '@/types'
import { USERS } from '@/data/users'

// Mock current user — replace with real auth in production
export const CURRENT_USER: User = {
  id: 'deisy',
  name: 'Deisy',
  role: 'Directora',
  initials: 'D',
  color: 'bg-violet-500',
  email: 'deisy@wipli.app',
  userRole: 'admin',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

interface UserStore {
  users: User[]
  // In production: replace with real auth session
  currentUser: User
  addUser: (user: User) => void
  updateUser: (id: string, updates: Partial<User>) => void
  deactivateUser: (id: string) => void
  activateUser: (id: string) => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      users: USERS,
      currentUser: CURRENT_USER,

      addUser: (user) =>
        set((s) => ({ users: [...s.users, user] })),

      updateUser: (id, updates) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u
          ),
        })),

      deactivateUser: (id) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id ? { ...u, status: 'inactive' as UserStatus, updatedAt: new Date().toISOString() } : u
          ),
        })),

      activateUser: (id) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id ? { ...u, status: 'active' as UserStatus, updatedAt: new Date().toISOString() } : u
          ),
        })),
    }),
    {
      name: 'wipli-users',
      version: 1,
      storage: {
        getItem: (name) => {
          const value = localStorage.getItem(name)
          return value ? JSON.parse(value) : null
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch {
            // localStorage quota exceeded — avatars are compressed but large collections
            // can still hit the limit. In production use S3/Supabase Storage.
            console.warn('[wipli-users] localStorage quota exceeded — avatar not saved.')
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)

export function useCurrentUser() {
  return useUserStore((s) => s.currentUser)
}
