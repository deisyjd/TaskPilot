import { Task } from '@/types'
import { getProject } from '@/data/projects'

interface Props {
  tasks: Task[]
}

export function ProjectsOverview({ tasks }: Props) {
  const activeTasks = tasks.filter((t) => t.status !== 'done')

  const byProject = activeTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.project] = (acc[t.project] ?? 0) + 1
    return acc
  }, {})

  const sorted = Object.entries(byProject).sort((a, b) => b[1] - a[1])

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-1">Proyectos activos</h3>
      <p className="text-xs text-gray-400 mb-4">{sorted.length} proyectos con tareas pendientes</p>

      <div className="space-y-2.5">
        {sorted.map(([project, count]) => {
          const projectData = getProject(project)
          return (
            <div key={project} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: projectData?.color ?? '#94a3b8' }}
                />
                <span className="text-sm text-gray-700">{project}</span>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
