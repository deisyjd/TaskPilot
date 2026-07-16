'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { useChatStore } from '@/store/useChatStore'
import { useAuthStore } from '@/store/useAuthStore'
import { isReminderDue } from '@/lib/reminders'
import { isReminderAlertsEnabled, notifyReminderDue } from '@/lib/reminderAlerts'

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
  const fetchReminders = useTaskStore((s) => s.fetchReminders)
  const alertedRemindersRef = useRef<Set<string>>(new Set())
  const firstReminderCheckRef = useRef(true)

  useEffect(() => {
    // Verify session with server, then wait for the initial data load too —
    // otherwise the shell renders with empty tasks/projects for a moment
    // (visible as "no hay tareas" that pops in once the fetch resolves).
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (data) {
          login(data)
          await Promise.all([fetchAll(), fetchUsers()])
          fetchConversations()
          // Registra en silencio los recordatorios que ya estaban vencidos al
          // cargar, para no dispararles sonido/notificación en cada recarga —
          // solo se alerta a los que se vencen mientras la pestaña sigue abierta.
          useTaskStore.getState().reminders.forEach((r) => {
            if (isReminderDue(r)) alertedRemindersRef.current.add(r.id)
          })
          firstReminderCheckRef.current = false
        }
      })
      .catch(() => {})
      .finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Contador de mensajes no leídos + recordatorios vencidos: sin websockets,
  // se refrescan por sondeo cada 30s (funciona aunque la pestaña de Wipli no
  // esté a la vista — solo necesita seguir abierta en algún lado).
  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(async () => {
      fetchConversations()
      await fetchReminders()
      if (firstReminderCheckRef.current || !isReminderAlertsEnabled()) return
      useTaskStore.getState().reminders.forEach((r) => {
        if (isReminderDue(r) && !alertedRemindersRef.current.has(r.id)) {
          alertedRemindersRef.current.add(r.id)
          notifyReminderDue(r)
        }
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [isLoggedIn, fetchConversations, fetchReminders])

  useEffect(() => {
    if (!ready) return
    if (!isLoggedIn && pathname !== '/login') router.replace('/login')
    if (isLoggedIn && pathname === '/login') router.replace('/dashboard')
  }, [ready, isLoggedIn, pathname, router])

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--tp-bg)' }}>
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--tp-border)', borderTopColor: 'var(--tp-dark)' }}
        />
      </div>
    )
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
