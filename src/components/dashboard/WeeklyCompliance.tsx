import { Task } from '@/types'
import { getProject } from '@/data/projects'
import { isSameDay, getWeekDays } from '@/lib/dates'
import { Progress } from '@/components/ui/progress'

interface Props {
  tasks: Task[]
}

export function WeeklyCompliance({ tasks }: Props) {
  const weekDays = getWeekDays()
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]

  const weekTasks = tasks.filter((t) => {
    const d = new Date(t.dueDate)
    return d >= weekStart && d <= weekEnd
  })

  const totalWeek = weekTasks.length
  const doneWeek = weekTasks.filter((t) => t.status === 'done' || t.status === 'scheduled').length
  const pct = totalWeek === 0 ? 0 : Math.round((doneWeek / totalWeek) * 100)

  const byProject = weekTasks.reduce<Record<string, { total: number; done: number }>>(
    (acc, t) => {
      if (!acc[t.project]) acc[t.project] = { total: 0, done: 0 }
      acc[t.project].total++
      if (t.status === 'done' || t.status === 'scheduled') acc[t.project].done++
      return acc
    },
    {}
  )

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Cumplimiento semanal</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {doneWeek} de {totalWeek} tareas completadas esta semana
          </p>
        </div>
        <span className="text-2xl font-bold text-violet-700">{pct}%</span>
      </div>

      <Progress value={pct} className="h-2 mb-6" />

      <div className="space-y-3">
        {Object.entries(byProject).map(([project, { total, done }]) => {
          const projectPct = total === 0 ? 0 : Math.round((done / total) * 100)
          const projectData = getProject(project)
          return (
            <div key={project}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: projectData?.color ?? '#94a3b8' }}
                  />
                  <span className="text-gray-700 font-medium">{project}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  {done}/{total}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${projectPct}%`,
                    backgroundColor: projectData?.color ?? '#8b5cf6',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
