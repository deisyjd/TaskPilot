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
  const { login } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    useTaskStore.persist.rehydrate()
    useUserStore.persist.rehydrate()
    useChatStore.persist.rehydrate()

    // Verify session with server
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (user) login(user)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [login])

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
