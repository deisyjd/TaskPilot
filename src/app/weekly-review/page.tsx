'use client'

import { useMemo } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { Task, STATUS_LABELS, STATUS_DOT_COLORS } from '@/types'
import { getProject } from '@/data/projects'
import { getUser } from '@/data/users'
import { USERS } from '@/data/users'
import { getWeekDays, isSameDay, formatDate, isOverdue } from '@/lib/dates'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  BarChart3,
  Users,
  TrendingUp,
} from 'lucide-react'

function SectionCard({
  title,
  icon,
  count,
  color,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className={cn('flex items-center gap-3 px-5 py-3.5 border-b border-gray-100', color)}>
        {icon}
        <span className="font-semibold text-sm">{title}</span>
        <span className="ml-auto text-sm font-bold">{count}</span>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const project = getProject(task.project)
  const user = getUser(task.assignee)
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT_COLORS[task.status])} />
      <p className="text-sm text-gray-800 flex-1 truncate">{task.title}</p>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1"
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: project?.color ?? '#94a3b8' }}
          />
          <span className="text-xs text-gray-400">{task.project}</span>
        </div>
        <div
          className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold',
            user?.color ?? 'bg-gray-400'
          )}
        >
          {user?.initials?.[0] ?? task.assignee[0]}
        </div>
      </div>
    </div>
  )
}

export default function WeeklyReviewPage() {
  const tasks = useTaskStore((s) => s.tasks)

  const weekDays = getWeekDays()
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const weekTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = new Date(t.dueDate); d.setHours(0,0,0,0)
      return d >= weekStart && d <= weekEnd
    })
  }, [tasks])

  const done = weekTasks.filter((t) => t.status === 'done')
  const pending = weekTasks.filter((t) => t.status === 'pending' || t.status === 'in-progress' || t.status === 'review' || t.status === 'scheduled')
  const overdue = weekTasks.filter((t) => isOverdue(t.dueDate, t.status))
  const blocked = weekTasks.filter((t) => t.status === 'blocked')

  const total = weekTasks.length
  const compliance = total === 0 ? 0 : Math.round(((done.length) / total) * 100)

  // Compliance by project
  const byProject = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {}
    weekTasks.forEach((t) => {
      if (!map[t.project]) map[t.project] = { total: 0, done: 0 }
      map[t.project].total++
      if (t.status === 'done') map[t.project].done++
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [weekTasks])

  // Compliance by user
  const byUser = useMemo(() => {
    const map: Record<string, { total: number; done: number; overdue: number }> = {}
    weekTasks.forEach((t) => {
      if (!map[t.assignee]) map[t.assignee] = { total: 0, done: 0, overdue: 0 }
      map[t.assignee].total++
      if (t.status === 'done') map[t.assignee].done++
      if (isOverdue(t.dueDate, t.status)) map[t.assignee].overdue++
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [weekTasks])

  const weekLabel = (() => {
    const MONTH = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    const s = weekDays[0], e = weekDays[6]
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()}–${e.getDate()} de ${MONTH[s.getMonth()]} ${s.getFullYear()}`
    return `${s.getDate()} ${MONTH[s.getMonth()]} – ${e.getDate()} ${MONTH[e.getMonth()]} ${e.getFullYear()}`
  })()

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Semana del</p>
            <h2 className="text-lg font-bold text-gray-900">{weekLabel}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">Cumplimiento</p>
            <p className="text-3xl font-bold text-violet-700">{compliance}%</p>
          </div>
        </div>
        <Progress value={compliance} className="h-2 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: total, color: 'text-gray-900', icon: <BarChart3 className="w-4 h-4 text-gray-400" /> },
            { label: 'Completadas', value: done.length, color: 'text-green-600', icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
            { label: 'Vencidas', value: overdue.length, color: 'text-red-500', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
            { label: 'Bloqueadas', value: blocked.length, color: 'text-orange-500', icon: <Ban className="w-4 h-4 text-orange-400" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="text-center">
              <div className="flex justify-center mb-1">{icon}</div>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Compliance by project */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-violet-500" />
            <h3 className="font-semibold text-gray-900">Cumplimiento por proyecto</h3>
          </div>
          <div className="space-y-3">
            {byProject.map(([project, { total, done: d }]) => {
              const pct = total === 0 ? 0 : Math.round((d / total) * 100)
              const projectData = getProject(project)
              return (
                <div key={project}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: projectData?.color ?? '#94a3b8' }} />
                      <span className="text-gray-700 font-medium">{project}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{d}/{total}</span>
                      <span className="font-semibold text-gray-700">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: projectData?.color ?? '#8b5cf6' }}
                    />
                  </div>
                </div>
              )
            })}
            {byProject.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin tareas esta semana</p>
            )}
          </div>
        </div>

        {/* Compliance by user */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-violet-500" />
            <h3 className="font-semibold text-gray-900">Cumplimiento por responsable</h3>
          </div>
          <div className="space-y-3">
            {byUser.map(([name, { total, done: d, overdue: ov }]) => {
              const pct = total === 0 ? 0 : Math.round((d / total) * 100)
              const user = getUser(name)
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold', user?.color ?? 'bg-gray-400')}>
                        {user?.initials?.[0] ?? name[0]}
                      </div>
                      <span className="text-gray-700 font-medium">{name}</span>
                      {ov > 0 && <span className="text-xs text-red-400">{ov} venc.</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{d}/{total}</span>
                      <span className="font-semibold text-gray-700">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {byUser.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin tareas esta semana</p>
            )}
          </div>
        </div>
      </div>

      {/* Task lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Completadas"
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
          count={done.length}
          color="text-green-700 bg-green-50"
        >
          {done.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-4">Sin completadas esta semana</p>
          ) : (
            done.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </SectionCard>

        <SectionCard
          title="Pendientes / En proceso"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          count={pending.length}
          color="text-blue-700 bg-blue-50"
        >
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-4">Sin pendientes esta semana</p>
          ) : (
            pending.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </SectionCard>

        <SectionCard
          title="Vencidas"
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          count={overdue.length}
          color="text-red-700 bg-red-50"
        >
          {overdue.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-4">Sin vencidas esta semana 🎉</p>
          ) : (
            overdue.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </SectionCard>

        <SectionCard
          title="Bloqueadas"
          icon={<Ban className="w-4 h-4 text-orange-500" />}
          count={blocked.length}
          color="text-orange-700 bg-orange-50"
        >
          {blocked.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 py-4">Sin bloqueadas esta semana</p>
          ) : (
            blocked.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </SectionCard>
      </div>
    </div>
  )
}
