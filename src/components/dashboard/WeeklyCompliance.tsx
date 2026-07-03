import { Task } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'
import { getWeekDays } from '@/lib/dates'

interface Props { tasks: Task[] }

export function WeeklyCompliance({ tasks }: Props) {
  const projects = useTaskStore((s) => s.projects)
  const weekDays = getWeekDays()
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]

  const weekTasks = tasks.filter((t) => {
    const d = new Date(t.dueDate)
    return d >= weekStart && d <= weekEnd
  })

  const total = weekTasks.length
  const done = weekTasks.filter((t) => t.status === 'done' || t.status === 'scheduled').length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const byProject = weekTasks.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
    if (!acc[t.projectId]) acc[t.projectId] = { total: 0, done: 0 }
    acc[t.projectId].total++
    if (t.status === 'done' || t.status === 'scheduled') acc[t.projectId].done++
    return acc
  }, {})

  return (
    <div
      className="p-6"
      style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', boxShadow: 'var(--tp-shadow-sm)', border: '1px solid var(--tp-border)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--tp-text)' }}>Cumplimiento semanal</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>{done} de {total} tareas completadas esta semana</p>
        </div>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: pct >= 70 ? 'var(--tp-lime)' : pct >= 40 ? '#FEF3C7' : '#FEE2E2' }}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--tp-dark)' }}>{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full mb-6 overflow-hidden" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? 'var(--tp-lime)' : pct >= 40 ? '#F59E0B' : '#EF4444' }}
        />
      </div>

      <div className="space-y-3.5">
        {Object.entries(byProject).map(([projectId, { total, done: d }]) => {
          const p = projects.find((pr) => pr.id === projectId)
          const ppct = total === 0 ? 0 : Math.round((d / total) * 100)
          return (
            <div key={projectId}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p?.color ?? '#94a3b8' }} />
                  <span className="font-medium" style={{ color: 'var(--tp-text)' }}>{p?.name ?? 'Sin proyecto'}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>{d}/{total}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
                <div className="h-full rounded-full" style={{ width: `${ppct}%`, backgroundColor: p?.color ?? '#8b5cf6' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
