'use client'

import { useEffect, useMemo, useState } from 'react'
import { isOverdue, formatDate } from '@/lib/dates'
import { STATUS_DOT_COLORS, TaskStatus } from '@/types'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  BarChart3,
  Users,
  Building2,
  Layers,
} from 'lucide-react'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

interface ReportChecklistItem {
  id: string
  done: boolean
  assigneeId: string | null
}

interface ReportTask {
  id: string
  title: string
  status: TaskStatus
  dueDate: string
  priority: string
  projectId: string
  projectName: string
  projectColor: string
  assigneeIds: string[]
  checklist: ReportChecklistItem[]
}

interface ReportUser {
  id: string
  name: string
  initials: string
  color: string
}

interface ReportCompany {
  id: string
  name: string
  color: string
  users: ReportUser[]
  tasks: ReportTask[]
}

function monthFromOffset(offset: number): { year: number; month: number } {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

// Un responsable "involucrado" en una tarea es quien la tiene asignada
// directamente o quien está etiquetado en alguno de sus ítems del checklist.
function taskInvolves(task: ReportTask, userId: string): boolean {
  return task.assigneeIds.includes(userId) || task.checklist.some((c) => c.assigneeId === userId)
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>{label}</p>
    </div>
  )
}

function TaskRow({ task, users }: { task: ReportTask; users: ReportUser[] }) {
  const user = users.find((u) => u.id === task.assigneeIds[0])
  const checklistTotal = task.checklist.length
  const checklistDone = task.checklist.filter((c) => c.done).length
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT_COLORS[task.status])} />
      <p className="text-sm flex-1 truncate" style={{ color: 'var(--tp-text)' }}>{task.title}</p>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.projectColor }} />
        <span className="text-xs truncate max-w-[100px]" style={{ color: 'var(--tp-text-2)' }}>{task.projectName}</span>
      </div>
      {checklistTotal > 0 && (
        <span className="text-xs shrink-0" style={{ color: 'var(--tp-text-2)' }}>
          {checklistDone}/{checklistTotal}
        </span>
      )}
      <span className="text-xs shrink-0" style={{ color: 'var(--tp-text-2)' }}>{formatDate(task.dueDate)}</span>
      {user && (
        <div
          className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0', user.color)}
          title={user.name}
        >
          {user.initials?.[0]}
        </div>
      )}
    </div>
  )
}

function SectionCard({
  title, icon, count, bg, textColor, children,
}: {
  title: string; icon: React.ReactNode; count: number; bg: string; textColor: string; children: React.ReactNode
}) {
  return (
    <div style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', border: '1px solid var(--tp-border)', overflow: 'hidden' }}>
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ backgroundColor: bg, color: textColor, borderBottom: '1px solid var(--tp-border)' }}>
        {icon}
        <span className="font-semibold text-sm">{title}</span>
        <span className="ml-auto text-sm font-bold">{count}</span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--tp-border)' }}>{children}</div>
    </div>
  )
}

function MonthlyReportBlock({
  title, color, tasks, users, responsibleFilter,
}: {
  title: string
  color: string
  tasks: ReportTask[]
  users: ReportUser[]
  responsibleFilter: string
}) {
  const filtered = useMemo(() => {
    if (responsibleFilter === 'all') return tasks
    return tasks.filter((t) => taskInvolves(t, responsibleFilter))
  }, [tasks, responsibleFilter])

  const done = filtered.filter((t) => t.status === 'done')
  const pending = filtered.filter((t) => ['pending', 'in-progress', 'review', 'scheduled'].includes(t.status))
  const overdue = filtered.filter((t) => isOverdue(t.dueDate, t.status))
  const blocked = filtered.filter((t) => t.status === 'blocked')
  const total = filtered.length
  const compliance = total === 0 ? 0 : Math.round((done.length / total) * 100)

  const byProject = useMemo(() => {
    const map: Record<string, { name: string; color: string; total: number; done: number }> = {}
    filtered.forEach((t) => {
      if (!map[t.projectId]) map[t.projectId] = { name: t.projectName, color: t.projectColor, total: 0, done: 0 }
      map[t.projectId].total++
      if (t.status === 'done') map[t.projectId].done++
    })
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total)
  }, [filtered])

  const byUser = useMemo(() => {
    return users
      .map((u) => {
        const involved = filtered.filter((t) => taskInvolves(t, u.id))
        return {
          user: u,
          total: involved.length,
          done: involved.filter((t) => t.status === 'done').length,
          overdue: involved.filter((t) => isOverdue(t.dueDate, t.status)).length,
        }
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [filtered, users])

  return (
    <div className="flex flex-col gap-4">
      {/* Header stats */}
      <div className="p-5" style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', border: '1px solid var(--tp-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-base font-bold" style={{ color: 'var(--tp-text)' }}>{title}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Cumplimiento</p>
            <p className="text-2xl font-bold" style={{ color }}>{compliance}%</p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${compliance}%`, backgroundColor: color }} />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={total} color="var(--tp-text)" icon={<BarChart3 className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />} />
          <StatCard label="Completadas" value={done.length} color="#16A34A" icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} />
          <StatCard label="Vencidas" value={overdue.length} color="#DC2626" icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
          <StatCard label="Bloqueadas" value={blocked.length} color="#EA580C" icon={<Ban className="w-4 h-4 text-orange-400" />} />
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm italic text-center py-6" style={{ color: 'var(--tp-text-2)' }}>
          Sin tareas este mes{responsibleFilter !== 'all' ? ' para este responsable' : ''}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* By project */}
            <div className="p-5" style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', border: '1px solid var(--tp-border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4" style={{ color }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--tp-text)' }}>Cumplimiento por proyecto</h3>
              </div>
              <div className="space-y-3">
                {byProject.map(([projectId, p]) => {
                  const pct = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100)
                  return (
                    <div key={projectId}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-medium" style={{ color: 'var(--tp-text)' }}>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--tp-text-2)' }}>
                          <span>{p.done}/{p.total}</span>
                          <span className="font-semibold" style={{ color: 'var(--tp-text)' }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* By responsible */}
            <div className="p-5" style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', border: '1px solid var(--tp-border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4" style={{ color }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--tp-text)' }}>Cumplimiento por responsable</h3>
              </div>
              <div className="space-y-3">
                {byUser.map(({ user, total: t, done: d, overdue: ov }) => {
                  const pct = t === 0 ? 0 : Math.round((d / t) * 100)
                  return (
                    <div key={user.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold', user.color)}>
                            {user.initials?.[0]}
                          </div>
                          <span className="font-medium" style={{ color: 'var(--tp-text)' }}>{user.name}</span>
                          {ov > 0 && <span className="text-xs" style={{ color: '#EF4444' }}>{ov} venc.</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--tp-text-2)' }}>
                          <span>{d}/{t}</span>
                          <span className="font-semibold" style={{ color: 'var(--tp-text)' }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  )
                })}
                {byUser.length === 0 && (
                  <p className="text-sm italic text-center py-4" style={{ color: 'var(--tp-text-2)' }}>Sin responsables con tareas.</p>
                )}
              </div>
            </div>
          </div>

          {/* Task lists */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Completadas" icon={<CheckCircle2 className="w-4 h-4" style={{ color: '#16A34A' }} />} count={done.length} bg="#F0FDF4" textColor="#15803D">
              {done.length === 0 ? <p className="text-sm italic px-5 py-4" style={{ color: 'var(--tp-text-2)' }}>Sin completadas este mes</p> : done.map((t) => <TaskRow key={t.id} task={t} users={users} />)}
            </SectionCard>
            <SectionCard title="Pendientes / En proceso" icon={<Clock className="w-4 h-4" style={{ color: '#2563EB' }} />} count={pending.length} bg="#EFF6FF" textColor="#1D4ED8">
              {pending.length === 0 ? <p className="text-sm italic px-5 py-4" style={{ color: 'var(--tp-text-2)' }}>Sin pendientes este mes</p> : pending.map((t) => <TaskRow key={t.id} task={t} users={users} />)}
            </SectionCard>
            <SectionCard title="Vencidas" icon={<AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />} count={overdue.length} bg="#FEF2F2" textColor="#B91C1C">
              {overdue.length === 0 ? <p className="text-sm italic px-5 py-4" style={{ color: 'var(--tp-text-2)' }}>Sin vencidas este mes 🎉</p> : overdue.map((t) => <TaskRow key={t.id} task={t} users={users} />)}
            </SectionCard>
            <SectionCard title="Bloqueadas" icon={<Ban className="w-4 h-4" style={{ color: '#EA580C' }} />} count={blocked.length} bg="#FFF7ED" textColor="#C2410C">
              {blocked.length === 0 ? <p className="text-sm italic px-5 py-4" style={{ color: 'var(--tp-text-2)' }}>Sin bloqueadas este mes</p> : blocked.map((t) => <TaskRow key={t.id} task={t} users={users} />)}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}

export default function MonthlyReportPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [companies, setCompanies] = useState<ReportCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupMode, setGroupMode] = useState<'combined' | 'separate'>('combined')
  const [responsibleFilter, setResponsibleFilter] = useState('all')

  const { year, month } = monthFromOffset(monthOffset)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/reports/monthly?year=${year}&month=${month}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar el reporte')
        return res.json()
      })
      .then((data) => { if (!cancelled) setCompanies(data.companies ?? []) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year, month])

  const allUsers = useMemo(() => {
    const map = new Map<string, ReportUser>()
    companies.forEach((c) => c.users.forEach((u) => map.set(u.id, u)))
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [companies])

  const allTasks = useMemo(() => companies.flatMap((c) => c.tasks), [companies])

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
        >
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="p-0.5 rounded transition-colors hover:opacity-70"
            style={{ color: 'var(--tp-text-2)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize" style={{ color: 'var(--tp-text)' }}>
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={monthOffset >= 0}
            className="p-0.5 rounded transition-colors hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--tp-text-2)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {monthOffset !== 0 && (
          <button onClick={() => setMonthOffset(0)} className="text-xs hover:underline" style={{ color: 'var(--tp-accent, #7c3aed)' }}>
            Este mes
          </button>
        )}

        {companies.length > 1 && (
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}>
            <button
              onClick={() => setGroupMode('combined')}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: groupMode === 'combined' ? 'var(--tp-dark)' : 'transparent',
                color: groupMode === 'combined' ? 'var(--tp-lime)' : 'var(--tp-text-2)',
              }}
            >
              <Layers className="w-3.5 h-3.5" />
              Agrupado
            </button>
            <button
              onClick={() => setGroupMode('separate')}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
              style={{
                backgroundColor: groupMode === 'separate' ? 'var(--tp-dark)' : 'transparent',
                color: groupMode === 'separate' ? 'var(--tp-lime)' : 'var(--tp-text-2)',
              }}
            >
              <Building2 className="w-3.5 h-3.5" />
              Por empresa
            </button>
          </div>
        )}

        {/* Responsible filter */}
        <Select value={responsibleFilter} onValueChange={(v) => setResponsibleFilter(v ?? 'all')}>
          <SelectTrigger className="w-56 h-9 bg-white text-sm">
            <SelectValue placeholder="Responsable">
              {(v: string) => (v === 'all' ? 'Todos los responsables' : allUsers.find((u) => u.id === v)?.name ?? 'Responsable')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los responsables</SelectItem>
            {allUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <p className="text-sm italic text-center py-10" style={{ color: 'var(--tp-text-2)' }}>Cargando reporte...</p>
      )}

      {error && !loading && (
        <p className="text-sm text-center py-10" style={{ color: '#DC2626' }}>{error}</p>
      )}

      {!loading && !error && companies.length === 0 && (
        <p className="text-sm italic text-center py-10" style={{ color: 'var(--tp-text-2)' }}>
          No tienes empresas asignadas.
        </p>
      )}

      {!loading && !error && companies.length > 0 && (
        groupMode === 'combined' ? (
          <MonthlyReportBlock
            title={companies.length > 1 ? 'Todas las empresas' : companies[0].name}
            color={companies.length > 1 ? 'var(--tp-dark)' : companies[0].color}
            tasks={allTasks}
            users={allUsers}
            responsibleFilter={responsibleFilter}
          />
        ) : (
          <div className="flex flex-col gap-8">
            {companies.map((c) => (
              <MonthlyReportBlock
                key={c.id}
                title={c.name}
                color={c.color}
                tasks={c.tasks}
                users={c.users}
                responsibleFilter={responsibleFilter}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
