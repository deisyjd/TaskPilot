import { Task } from '@/types'
import { getUser } from '@/data/users'
import { cn } from '@/lib/utils'

interface Props {
  tasks: Task[]
}

export function TopAssignees({ tasks }: Props) {
  const activeTasks = tasks.filter((t) => t.status !== 'done')

  const byAssignee = activeTasks.reduce<Record<string, { total: number; blocked: number; overdue: number }>>(
    (acc, t) => {
      if (!acc[t.assignee]) acc[t.assignee] = { total: 0, blocked: 0, overdue: 0 }
      acc[t.assignee].total++
      if (t.status === 'blocked') acc[t.assignee].blocked++
      const today = new Date(); today.setHours(0,0,0,0)
      if (new Date(t.dueDate) < today && t.status !== 'done') acc[t.assignee].overdue++
      return acc
    },
    {}
  )

  const sorted = Object.entries(byAssignee).sort((a, b) => b[1].total - a[1].total)
  const max = sorted[0]?.[1].total ?? 1

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-1">Responsables</h3>
      <p className="text-xs text-gray-400 mb-4">Carga de trabajo activa por persona</p>

      <div className="space-y-3">
        {sorted.map(([name, { total, blocked, overdue }]) => {
          const user = getUser(name)
          const pct = Math.round((total / max) * 100)
          return (
            <div key={name} className="flex items-center gap-3">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                  user?.color ?? 'bg-gray-400'
                )}
              >
                {user?.initials ?? name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {overdue > 0 && (
                      <span className="text-red-500 font-medium">{overdue} vencida{overdue > 1 ? 's' : ''}</span>
                    )}
                    {blocked > 0 && (
                      <span className="text-orange-400 font-medium">{blocked} bloq.</span>
                    )}
                    <span className="text-gray-400">{total}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${pct}%` }}
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
