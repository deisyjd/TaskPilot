import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  isLoggedIn: boolean
  login: () => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      login: () => set({ isLoggedIn: true }),
      logout: () => set({ isLoggedIn: false }),
    }),
    {
      name: 'wipli-auth',
      skipHydration: true,
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          const value = localStorage.getItem(name)
          return value ? JSON.parse(value) : null
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return
          localStorage.removeItem(name)
        },
      },
    }
  )
)
