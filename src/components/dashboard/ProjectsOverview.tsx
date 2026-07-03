import { Task } from '@/types'
import { useTaskStore } from '@/store/useTaskStore'

interface Props { tasks: Task[] }

export function ProjectsOverview({ tasks }: Props) {
  const projects = useTaskStore((s) => s.projects)
  const active = tasks.filter((t) => t.status !== 'done')
  const byProject = active.reduce<Record<string, number>>((acc, t) => {
    acc[t.projectId] = (acc[t.projectId] ?? 0) + 1
    return acc
  }, {})
  const sorted = Object.entries(byProject).sort((a, b) => b[1] - a[1])

  return (
    <div
      className="p-6"
      style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', boxShadow: 'var(--tp-shadow-sm)', border: '1px solid var(--tp-border)' }}
    >
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--tp-text)' }}>Proyectos activos</h3>
      <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>{sorted.length} con tareas pendientes</p>

      <div className="space-y-2.5">
        {sorted.map(([projectId, count]) => {
          const p = projects.find((pr) => pr.id === projectId)
          return (
            <div key={projectId} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p?.color ?? '#94a3b8' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>{p?.name ?? 'Sin proyecto'}</span>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
              >
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
