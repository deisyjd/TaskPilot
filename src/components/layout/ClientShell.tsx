'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { useChatStore } from '@/store/useChatStore'
import { useAuthStore } from '@/store/useAuthStore'

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const companies = useAuthStore((s) => s.companies)
  const { login } = useAuthStore()
  const fetchAll = useTaskStore((s) => s.fetchAll)
  const fetchUsers = useUserStore((s) => s.fetchUsers)
  const pathname = usePathname()
  const router = useRouter()

  const fetchConversations = useChatStore((s) => s.fetchConversations)

  useEffect(() => {
    // Verify session with server
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          login(data)
          fetchAll()
          fetchUsers()
          fetchConversations()
        }
      })
      .catch(() => {})
      .finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Contador de mensajes no leídos: sin websockets, se refresca por sondeo.
  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(() => fetchConversations(), 30000)
    return () => clearInterval(interval)
  }, [isLoggedIn, fetchConversations])

  useEffect(() => {
    if (!ready) return
    if (!isLoggedIn && pathname !== '/login') router.replace('/login')
    if (isLoggedIn && pathname === '/login') router.replace('/dashboard')
  }, [ready, isLoggedIn, pathname, router])

  if (!ready) {
    return <div className="h-screen" style={{ backgroundColor: 'var(--tp-bg)' }} />
  }

  if (pathname === '/login') {
    return <>{children}</>
  }

  if (!isLoggedIn) {
    return <div className="h-screen" style={{ backgroundColor: 'var(--tp-bg)' }} />
  }

  if (isLoggedIn && companies.length === 0) {
    return (
      <div
        className="h-screen flex items-center justify-center text-center p-6"
        style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)' }}
      >
        <p className="text-sm max-w-sm" style={{ color: 'var(--tp-text-2)' }}>
          No tienes ninguna empresa asignada. Contacta a un administrador para que te agregue a una empresa.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  )
}
