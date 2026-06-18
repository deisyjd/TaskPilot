'use client'

import { useMemo, useState } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { USERS } from '@/data/users'
import { Task, STATUS_DOT_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/types'
import { getProject } from '@/data/projects'
import { isOverdue, isToday, formatDate } from '@/lib/dates'
import { TaskModal } from '@/components/board/TaskModal'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

function StatPill({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl font-semibold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
        {label}
      </span>
    </div>
  )
}

function UserCard({ userName }: { userName: string }) {
  const tasks = useTaskStore((s) => s.tasks)
  const [expanded, setExpanded] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const user = USERS.find((u) => u.name === userName)

  const userTasks = useMemo(() => tasks.filter((t) => t.assignee === userName), [tasks, userName])

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const total = userTasks.length
    const done = userTasks.filter((t) => t.status === 'done').length
    const inProgress = userTasks.filter((t) => t.status === 'in-progress').length
    const overdue = userTasks.filter((t) => isOverdue(t.dueDate, t.status)).length
    const blocked = userTasks.filter((t) => t.status === 'blocked').length
    const dueToday = userTasks.filter((t) => isToday(t.dueDate) && t.status !== 'done').length
    const compliance = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, inProgress, overdue, blocked, dueToday, compliance }
  }, [userTasks])

  const activeTasks = useMemo(
    () =>
      userTasks
        .filter((t) => t.status !== 'done')
        .sort((a, b) => {
          const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          return pOrder[a.priority] - pOrder[b.priority]
        }),
    [userTasks]
  )

  const visibleTasks = expanded ? activeTasks : activeTasks.slice(0, 3)

  const openTask = (task: Task) => { setSelectedTask(task); setModalOpen(true) }

  return (
    <>
      <div
        className="p-5"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
          boxShadow: 'var(--tp-shadow-sm)',
        }}
      >
        {/* User header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0',
              user?.color ?? 'bg-gray-400'
            )}
          >
            {user?.initials ?? userName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base leading-tight" style={{ color: 'var(--tp-text)' }}>
              {userName}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              {user?.role ?? 'Colaborador'}
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-sm font-semibold"
            style={{
              backgroundColor: stats.compliance >= 70 ? 'var(--tp-lime)' : stats.compliance >= 40 ? '#FEF9C3' : '#FEE2E2',
              color: stats.compliance >= 70 ? 'var(--tp-dark)' : stats.compliance >= 40 ? '#92400E' : '#DC2626',
            }}
          >
            {stats.compliance}%
          </div>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-4 gap-2 py-3 mb-4 rounded-2xl"
          style={{ backgroundColor: 'var(--tp-bg)', padding: '12px 16px' }}
        >
          <StatPill value={stats.total} label="Total" color="var(--tp-text)" />
          <StatPill value={stats.done} label="Listas" color="#16A34A" />
          <StatPill value={stats.overdue} label="Vencidas" color={stats.overdue > 0 ? '#DC2626' : 'var(--tp-text-2)'} />
          <StatPill value={stats.blocked} label="Bloq." color={stats.blocked > 0 ? '#EA580C' : 'var(--tp-text-2)'} />
        </div>

        {/* Compliance bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
            <span>Cumplimiento</span>
            <span className="font-medium">{stats.done}/{stats.total} completadas</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${stats.compliance}%`,
                backgroundColor:
                  stats.compliance >= 70
                    ? 'var(--tp-lime)'
                    : stats.compliance >= 40
                    ? '#F59E0B'
                    : '#EF4444',
              }}
            />
          </div>
        </div>

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--tp-text-2)' }}>
              Tareas activas ({activeTasks.length})
            </p>
            <div className="space-y-1.5">
              {visibleTasks.map((task) => {
                const project = getProject(task.project)
                const overdue = isOverdue(task.dueDate, task.status)
                const dueToday = isToday(task.dueDate)
                return (
                  <button
                    key={task.id}
                    onClick={() => openTask(task)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--tp-bg)', border: '1px solid var(--tp-border)' }}
                  >
                    <div
                      className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT_COLORS[task.status])}
                    />
                    <p className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--tp-text)' }}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: project?.color ?? '#94a3b8' }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: overdue ? '#DC2626' : dueToday ? '#D97706' : 'var(--tp-text-2)' }}
                      >
                        {formatDate(task.dueDate)}
                      </span>
                      {overdue && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {activeTasks.length > 3 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium mt-2.5 w-full justify-center py-2 rounded-xl transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Ver {activeTasks.length - 3} más
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {activeTasks.length === 0 && (
          <div
            className="flex items-center justify-center py-5 rounded-2xl text-sm"
            style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text-2)' }}
          >
            Sin tareas activas ✓
          </div>
        )}
      </div>

      <TaskModal
        open={modalOpen}
        task={selectedTask}
        defaultStatus="pending"
        onClose={() => { setModalOpen(false); setSelectedTask(null) }}
      />
    </>
  )
}

export default function UsersPage() {
  const tasks = useTaskStore((s) => s.tasks)

  const globalStats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'done').length
    const done = tasks.filter((t) => t.status === 'done').length
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length
    const blocked = tasks.filter((t) => t.status === 'blocked').length
    return { active, done, overdue, blocked }
  }, [tasks])

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div
        className="grid grid-cols-4 gap-4 p-5"
        style={{
          backgroundColor: 'var(--tp-dark)',
          borderRadius: 'var(--tp-r-card)',
        }}
      >
        {[
          { label: 'Tareas activas', value: globalStats.active, icon: <Clock className="w-5 h-5" />, color: 'var(--tp-lime)' },
          { label: 'Completadas', value: globalStats.done, icon: <CheckCircle2 className="w-5 h-5" />, color: '#4ADE80' },
          { label: 'Vencidas', value: globalStats.overdue, icon: <AlertTriangle className="w-5 h-5" />, color: '#F87171' },
          { label: 'Bloqueadas', value: globalStats.blocked, icon: <Ban className="w-5 h-5" />, color: '#FB923C' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color }}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{value}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* User cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {USERS.map((user) => (
          <UserCard key={user.id} userName={user.name} />
        ))}
      </div>
    </div>
  )
}
