import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  userRole: string
  initials: string
  color: string
  avatarUrl?: string | null
}

interface AuthStore {
  isLoggedIn: boolean
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  isLoggedIn: false,
  user: null,
  login: (user) => set({ isLoggedIn: true, user }),
  logout: () => set({ isLoggedIn: false, user: null }),
}))
