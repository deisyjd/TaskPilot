import { Task } from '@/types'
import { getUser } from '@/data/users'
import { cn } from '@/lib/utils'

interface Props { tasks: Task[] }

export function TopAssignees({ tasks }: Props) {
  const active = tasks.filter((t) => t.status !== 'done')

  const byAssignee = active.reduce<Record<string, { total: number; blocked: number; overdue: number }>>((acc, t) => {
    if (!acc[t.assignee]) acc[t.assignee] = { total: 0, blocked: 0, overdue: 0 }
    acc[t.assignee].total++
    if (t.status === 'blocked') acc[t.assignee].blocked++
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(t.dueDate) < today && t.status !== 'done') acc[t.assignee].overdue++
    return acc
  }, {})

  const sorted = Object.entries(byAssignee).sort((a, b) => b[1].total - a[1].total)
  const max = sorted[0]?.[1].total ?? 1

  return (
    <div
      className="p-6"
      style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', boxShadow: 'var(--tp-shadow-sm)', border: '1px solid var(--tp-border)' }}
    >
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--tp-text)' }}>Responsables</h3>
      <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>Carga de trabajo activa</p>

      <div className="space-y-4">
        {sorted.map(([name, { total, blocked, overdue }]) => {
          const user = getUser(name)
          const pct = Math.round((total / max) * 100)
          return (
            <div key={name} className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-semibold shrink-0', user?.color ?? 'bg-gray-400')}>
                {user?.initials?.[0] ?? name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>{name}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {overdue > 0 && <span className="text-red-500 font-medium">{overdue} venc.</span>}
                    {blocked > 0 && <span className="text-orange-400 font-medium">{blocked} bloq.</span>}
                    <span style={{ color: 'var(--tp-text-2)' }}>{total}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: 'var(--tp-dark)' }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
