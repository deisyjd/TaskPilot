'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Plus, AlertTriangle, Clock, ChevronRight, Menu, BellRing } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useMobileNavStore } from '@/store/useMobileNavStore'
import { isOverdue } from '@/lib/dates'
import { isReminderDue, formatReminderDateTime } from '@/lib/reminders'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { Task, Reminder } from '@/types'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard':    { title: 'Dashboard',             sub: 'Resumen de operaciones del día' },
  '/board':        { title: 'Tablero',               sub: 'Gestión de tareas por estado' },
  '/timeline':     { title: 'Línea de tiempo',       sub: 'Vista semanal de entregas' },
  '/weekly-review':{ title: 'Revisión semanal',      sub: 'Cumplimiento y pendientes' },
  '/users':        { title: 'Responsables',          sub: 'Carga de trabajo por usuario' },
  '/history':      { title: 'Historial',             sub: 'Registro de actividad' },
  '/settings':     { title: 'Configuración',         sub: 'Preferencias del sistema' },
  '/chats':        { title: 'Chats',                 sub: 'Mensajes y conversaciones del equipo' },
  '/admin/users':  { title: 'Administración',        sub: 'Gestión de usuarios y roles' },
  '/projects':     { title: 'Proyectos',             sub: 'Todos los proyectos activos' },
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const PRIORITY_LABELS: Record<string, string> = { urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja' }
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#DC2626',
  high:   '#EA580C',
  medium: '#D97706',
  low:    '#16A34A',
}

function NotifItem({ task }: { task: Task & { reason: string } }) {
  const color = PRIORITY_COLORS[task.priority] ?? '#6B7280'
  const projectName = useTaskStore((s) => s.projects.find((p) => p.id === task.projectId)?.name) ?? 'Sin proyecto'
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-[var(--tp-bg)]"
      style={{ borderColor: 'var(--tp-border)' }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {task.reason === 'overdue'
          ? <AlertTriangle className="w-3.5 h-3.5" />
          : <Clock className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--tp-text)' }}>
          {task.title || 'Sin título'}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold" style={{ color }}>
            {task.reason === 'overdue' ? 'Vencida' : 'Urgente'}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--tp-text-2)' }}>·</span>
          <span className="text-[10px]" style={{ color: 'var(--tp-text-2)' }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--tp-text-2)' }}>·</span>
          <span className="text-[10px]" style={{ color: 'var(--tp-text-2)' }}>
            {projectName}
          </span>
        </div>
        {task.dueDate && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
            Vence: {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('es-ES', {
              day: 'numeric', month: 'short',
            })}
          </p>
        )}
      </div>
    </div>
  )
}

function ReminderNotifItem({ reminder }: { reminder: Reminder }) {
  const overdue = isOverdue(reminder.dueDate, 'pending')
  const color = overdue ? '#DC2626' : '#8B5CF6'
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-[var(--tp-bg)]"
      style={{ borderColor: 'var(--tp-border)' }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <BellRing className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--tp-text)' }}>
          {reminder.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold" style={{ color }}>
            {overdue ? 'Vencido' : 'Recordatorio'}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--tp-text-2)' }}>·</span>
          <span className="text-[10px]" style={{ color: 'var(--tp-text-2)' }}>
            {reminder.projectName}
          </span>
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
          {formatReminderDateTime(reminder)}
        </p>
      </div>
    </div>
  )
}

export function Header() {
  const pathname = usePathname()
  const page = pageTitles[pathname] ?? { title: 'Wipli', sub: '' }
  const tasks = useTaskStore((s) => s.tasks)
  const reminders = useTaskStore((s) => s.reminders)
  const { toggle: toggleMobileNav } = useMobileNavStore()
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Build notification list: overdue + urgent (not done/blocked)
  const notifTasks = tasks
    .filter((t) => t.status !== 'done')
    .reduce<(Task & { reason: string })[]>((acc, t) => {
      if (isOverdue(t.dueDate, t.status)) {
        acc.push({ ...t, reason: 'overdue' })
      } else if (t.priority === 'urgent') {
        acc.push({ ...t, reason: 'urgent' })
      }
      return acc
    }, [])
    .sort((a, b) => {
      // overdue first, then by priority
      if (a.reason !== b.reason) return a.reason === 'overdue' ? -1 : 1
      return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    })

  // Recordatorios cuya fecha/hora ya llegó, sin marcar como hechos.
  const notifReminders = reminders
    .filter(isReminderDue)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? '').localeCompare(b.dueTime ?? ''))

  const alertCount = notifTasks.length + notifReminders.length

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  return (
    <header
      className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4"
      style={{
        backgroundColor: 'var(--tp-bg)',
        borderBottom: '1px solid var(--tp-border)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleMobileNav}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:opacity-80"
          style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
        >
          <Menu className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
        </button>

        <div className="min-w-0">
          <h1 className="text-base lg:text-xl font-semibold truncate" style={{ color: 'var(--tp-text)' }}>
            {page.title}
          </h1>
          {page.sub && (
            <p className="text-xs lg:text-sm mt-0.5 hidden sm:block" style={{ color: 'var(--tp-text-2)' }}>
              {page.sub}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
            style={{
              backgroundColor: notifOpen ? 'var(--tp-dark)' : 'var(--tp-surface)',
              border: '1px solid var(--tp-border)',
            }}
          >
            <Bell
              className="w-4 h-4"
              style={{ color: notifOpen ? '#fff' : 'var(--tp-text-2)' }}
            />
          </button>

          {/* Badge */}
          {alertCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white flex items-center justify-center font-bold pointer-events-none"
              style={{
                backgroundColor: '#EF4444',
                fontSize: '10px',
                padding: '0 4px',
                lineHeight: '18px',
              }}
            >
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}

          {/* Dropdown panel */}
          {notifOpen && (
            <div
              className="absolute right-0 top-11 z-50 overflow-hidden"
              style={{
                width: '320px',
                borderRadius: '16px',
                border: '1px solid var(--tp-border)',
                backgroundColor: 'var(--tp-surface)',
                boxShadow: '0 12px 40px rgba(17,19,24,0.16)',
              }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--tp-border)' }}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--tp-text)' }}>
                    Alertas
                  </span>
                  {alertCount > 0 && (
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                    >
                      {alertCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-medium transition-all hover:opacity-70"
                  style={{ color: 'var(--tp-text-2)' }}
                >
                  Cerrar
                </button>
              </div>

              {/* List */}
              <div className="max-h-[360px] overflow-y-auto">
                {notifTasks.length === 0 && notifReminders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--tp-bg-2)' }}
                    >
                      <Bell className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
                      Sin alertas pendientes
                    </p>
                  </div>
                ) : (
                  <>
                    {notifTasks.map((t) => <NotifItem key={t.id} task={t} />)}
                    {notifReminders.map((r) => <ReminderNotifItem key={r.id} reminder={r} />)}
                  </>
                )}
              </div>

              {/* Footer link */}
              {(notifTasks.length > 0 || notifReminders.length > 0) && (
                <div style={{ borderTop: '1px solid var(--tp-border)' }}>
                  <a
                    href="/board"
                    className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-all hover:opacity-70"
                    style={{ color: 'var(--tp-text-2)' }}
                    onClick={() => setNotifOpen(false)}
                  >
                    Ver todas en el tablero
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New project button */}
        <button
          onClick={() => setProjectModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 text-sm font-medium transition-all hover:opacity-88"
          style={{
            backgroundColor: 'var(--tp-dark)',
            color: '#FFFFFF',
            borderRadius: 'var(--tp-r-btn)',
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo proyecto</span>
        </button>
      </div>

      <ProjectModal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
    </header>
  )
}
