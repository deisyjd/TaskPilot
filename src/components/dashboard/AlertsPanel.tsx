import { Task } from '@/types'
import { isOverdue, isToday, formatDate } from '@/lib/dates'
import { AlertTriangle, Clock, Ban, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/store/useTaskStore'

interface Props { tasks: Task[] }

type AlertKind = 'overdue' | 'today' | 'urgent' | 'blocked'
type AlertItem = { task: Task; kind: AlertKind }

const config: Record<AlertKind, { label: string; icon: React.ReactNode; dot: string; bg: string; text: string }> = {
  overdue:  { label: 'Vencida',   icon: <AlertTriangle className="w-3.5 h-3.5" />, dot: '#EF4444', bg: '#FEF2F2', text: '#DC2626' },
  today:    { label: 'Hoy',       icon: <Clock className="w-3.5 h-3.5" />,         dot: '#F59E0B', bg: '#FFFBEB', text: '#D97706' },
  urgent:   { label: 'Urgente',   icon: <CalendarClock className="w-3.5 h-3.5" />, dot: '#F97316', bg: '#FFF7ED', text: '#EA580C' },
  blocked:  { label: 'Bloqueada', icon: <Ban className="w-3.5 h-3.5" />,           dot: '#9CA3AF', bg: '#F9FAFB', text: '#6B7280' },
}

export function AlertsPanel({ tasks }: Props) {
  const projects = useTaskStore((s) => s.projects)
  const alerts: AlertItem[] = []
  for (const task of tasks) {
    if (task.status === 'done') continue
    if (isOverdue(task.dueDate, task.status)) alerts.push({ task, kind: 'overdue' })
    else if (isToday(task.dueDate)) alerts.push({ task, kind: 'today' })
    else if (task.priority === 'urgent') alerts.push({ task, kind: 'urgent' })
    else if (task.status === 'blocked') alerts.push({ task, kind: 'blocked' })
  }
  const order: Record<AlertKind, number> = { overdue: 0, today: 1, urgent: 2, blocked: 3 }
  alerts.sort((a, b) => order[a.kind] - order[b.kind])

  return (
    <div
      className="p-6"
      style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', boxShadow: 'var(--tp-shadow-sm)', border: '1px solid var(--tp-border)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--tp-text)' }}>Alertas</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>{alerts.length} tareas requieren atención</p>
        </div>
        <Link href="/board" className="text-xs font-medium hover:underline" style={{ color: 'var(--tp-dark)' }}>
          Ver tablero →
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div
          className="flex items-center justify-center h-20 rounded-2xl text-sm"
          style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
        >
          Sin alertas activas ✓
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {alerts.map(({ task, kind }) => {
            const c = config[kind]
            return (
              <div
                key={`${task.id}-${kind}`}
                className="flex items-start gap-3 px-3.5 py-3 rounded-2xl"
                style={{ backgroundColor: c.bg }}
              >
                <div className="mt-0.5 shrink-0" style={{ color: c.text }}>{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tp-text)' }}>{task.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
                    {projects.find((p) => p.id === task.projectId)?.name ?? 'Sin proyecto'} · {formatDate(task.dueDate)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.dot + '22', color: c.text }}>
                  {c.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
