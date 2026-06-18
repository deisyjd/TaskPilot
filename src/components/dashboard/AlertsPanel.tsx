import { Task, STATUS_DOT_COLORS } from '@/types'
import { isOverdue, isToday, formatDate } from '@/lib/dates'
import { AlertTriangle, Clock, Ban, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  tasks: Task[]
}

type AlertItem = {
  task: Task
  kind: 'overdue' | 'today' | 'urgent' | 'blocked'
}

export function AlertsPanel({ tasks }: Props) {
  const alerts: AlertItem[] = []

  for (const task of tasks) {
    if (task.status === 'done') continue
    if (isOverdue(task.dueDate, task.status)) {
      alerts.push({ task, kind: 'overdue' })
    } else if (isToday(task.dueDate)) {
      alerts.push({ task, kind: 'today' })
    } else if (task.priority === 'urgent') {
      alerts.push({ task, kind: 'urgent' })
    } else if (task.status === 'blocked') {
      alerts.push({ task, kind: 'blocked' })
    }
  }

  const order = { overdue: 0, today: 1, urgent: 2, blocked: 3 }
  alerts.sort((a, b) => order[a.kind] - order[b.kind])

  const config = {
    overdue: {
      label: 'Vencida',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      className: 'bg-red-50 text-red-600 border-red-100',
    },
    today: {
      label: 'Vence hoy',
      icon: <Clock className="w-3.5 h-3.5" />,
      className: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    urgent: {
      label: 'Urgente',
      icon: <CalendarClock className="w-3.5 h-3.5" />,
      className: 'bg-orange-50 text-orange-600 border-orange-100',
    },
    blocked: {
      label: 'Bloqueada',
      icon: <Ban className="w-3.5 h-3.5" />,
      className: 'bg-gray-50 text-gray-500 border-gray-200',
    },
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Alertas</h3>
          <p className="text-xs text-gray-400 mt-0.5">{alerts.length} tareas requieren atención</p>
        </div>
        <Link href="/board" className="text-xs text-violet-600 hover:underline">
          Ver tablero
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Sin alertas activas</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {alerts.map(({ task, kind }) => {
            const c = config[kind]
            return (
              <div
                key={`${task.id}-${kind}`}
                className={cn('flex items-start gap-3 rounded-lg border p-3', c.className)}
              >
                <div className="mt-0.5 shrink-0">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs opacity-75">{task.project}</span>
                    <span className="text-xs opacity-50">·</span>
                    <span className="text-xs opacity-75">{formatDate(task.dueDate)}</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold opacity-80">{c.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
