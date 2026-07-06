import { create } from 'zustand'
import { AuthUser, Company } from '@/types'

interface MePayload {
  user?: AuthUser
  companies: Company[]
  activeCompanyId: string
  [key: string]: unknown
}

interface AuthStore {
  isLoggedIn: boolean
  user: AuthUser | null
  companies: Company[]
  activeCompanyId: string | null
  switchingCompany: boolean
  login: (payload: MePayload) => void
  setActiveCompany: (companyId: string) => Promise<boolean>
  addCompany: (name: string, color?: string) => Promise<boolean>
  deleteCompany: (companyId: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  isLoggedIn: false,
  user: null,
  companies: [],
  activeCompanyId: null,
  switchingCompany: false,
  login: (payload) => {
    const { user: _user, companies, activeCompanyId, ...rest } = payload
    const user = (_user ?? (rest as unknown as AuthUser)) as AuthUser
    set({ isLoggedIn: true, user, companies, activeCompanyId })
  },
  setActiveCompany: async (companyId) => {
    if (companyId === get().activeCompanyId) return true
    set({ switchingCompany: true })
    try {
      const res = await fetch('/api/auth/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      if (!res.ok) return false
      const data = await res.json()
      set((state) => ({
        activeCompanyId: data.activeCompanyId,
        user: state.user ? { ...state.user, userRole: data.userRole } : state.user,
      }))
      return true
    } finally {
      set({ switchingCompany: false })
    }
  },
  addCompany: async (name, color) => {
    set({ switchingCompany: true })
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) return false
      const data = await res.json()
      set((state) => ({
        companies: [...state.companies, data.company],
        activeCompanyId: data.activeCompanyId,
        user: state.user ? { ...state.user, userRole: data.userRole } : state.user,
      }))
      return true
    } finally {
      set({ switchingCompany: false })
    }
  },
  deleteCompany: async (companyId) => {
    set({ switchingCompany: true })
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error ?? 'No se pudo eliminar la empresa' }
      set((state) => ({
        companies: state.companies.filter((c) => c.id !== companyId),
        activeCompanyId: data.activeCompanyId,
        user: state.user ? { ...state.user, userRole: data.userRole } : state.user,
      }))
      return { ok: true }
    } finally {
      set({ switchingCompany: false })
    }
  },
  logout: () => set({ isLoggedIn: false, user: null, companies: [], activeCompanyId: null }),
}))
