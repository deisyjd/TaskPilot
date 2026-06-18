'use client'

import { useMemo } from 'react'
import { MOCK_TASKS } from '@/data'
import { isOverdue, isToday, getWeekDays } from '@/lib/dates'
import { StatCard } from '@/components/dashboard/StatCard'
import { WeeklyCompliance } from '@/components/dashboard/WeeklyCompliance'
import { ProjectsOverview } from '@/components/dashboard/ProjectsOverview'
import { TopAssignees } from '@/components/dashboard/TopAssignees'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import {
  ListTodo,
  AlertTriangle,
  Clock,
  Send,
  Briefcase,
} from 'lucide-react'

export default function DashboardPage() {
  const tasks = MOCK_TASKS

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const weekDays = getWeekDays()
    const weekStart = weekDays[0]
    const weekEnd = weekDays[6]

    const active = tasks.filter((t) => t.status !== 'done')
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status))
    const todayTasks = tasks.filter((t) => isToday(t.dueDate) && t.status !== 'done')
    const pendingPublications = tasks.filter(
      (t) => t.type === 'publication' && t.status !== 'done'
    )
    const activeProjects = new Set(active.map((t) => t.project)).size

    const weekTasks = tasks.filter((t) => {
      const d = new Date(t.dueDate)
      return d >= weekStart && d <= weekEnd
    })
    const weekDone = weekTasks.filter(
      (t) => t.status === 'done' || t.status === 'scheduled'
    ).length
    const compliance =
      weekTasks.length === 0
        ? 0
        : Math.round((weekDone / weekTasks.length) * 100)

    return {
      active: active.length,
      overdue: overdue.length,
      today: todayTasks.length,
      pendingPublications: pendingPublications.length,
      activeProjects,
      compliance,
    }
  }, [tasks])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Tareas activas"
          value={stats.active}
          icon={<ListTodo className="w-5 h-5" />}
          description="Excluyendo completadas"
          variant="default"
        />
        <StatCard
          title="Vencidas"
          value={stats.overdue}
          icon={<AlertTriangle className="w-5 h-5" />}
          description="Requieren atención inmediata"
          variant={stats.overdue > 0 ? 'danger' : 'default'}
        />
        <StatCard
          title="Para hoy"
          value={stats.today}
          icon={<Clock className="w-5 h-5" />}
          description="Con fecha límite hoy"
          variant={stats.today > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Publicaciones pendientes"
          value={stats.pendingPublications}
          icon={<Send className="w-5 h-5" />}
          description="Por publicar o programar"
          variant="violet"
        />
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyCompliance tasks={tasks} />
        </div>
        <div>
          <ProjectsOverview tasks={tasks} />
        </div>
      </div>

      {/* Tercera fila */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopAssignees tasks={tasks} />
        <AlertsPanel tasks={tasks} />
      </div>
    </div>
  )
}
