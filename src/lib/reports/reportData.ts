import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { taskVisibilityFilter } from '@/app/api/tasks/route'
import { STATUS_LABELS, PRIORITY_LABELS, TaskStatus, Priority } from '@/types'

// Agrega el "avance" de una empresa (o un proyecto) en un rango de fechas.
// Se filtra por dueDate dentro del rango y respeta la visibilidad del usuario
// que genera el reporte.

export interface ReportTaskRow {
  title: string
  statusLabel: string
  priorityLabel: string
  dueDate: string
  projectName: string
  assignees: string
}

export interface ReportData {
  companyName: string
  projectName: string | null
  start: string
  end: string
  generatedBy: string
  totals: { total: number; done: number; pending: number; completionRate: number }
  byStatus: { label: string; count: number }[]
  byProject: { name: string; total: number; done: number }[]
  byAssignee: { name: string; total: number; done: number }[]
  tasks: ReportTaskRow[]
}

interface BuildOpts {
  userId: string
  userRole: string
  companyId: string
  companyName: string
  projectId?: string | null
  projectName?: string | null
  start: string
  end: string
  generatedBy: string
}

const STATUS_ORDER: TaskStatus[] = ['pending', 'in-progress', 'review', 'scheduled', 'blocked', 'done']

export async function buildReportData(opts: BuildOpts): Promise<ReportData> {
  const where: Prisma.TaskWhereInput = {
    companyId: opts.companyId,
    dueDate: { gte: opts.start, lte: opts.end },
    ...taskVisibilityFilter({ userRole: opts.userRole, userId: opts.userId }),
  }
  if (opts.projectId) where.projectId = opts.projectId

  const [tasks, memberships] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { project: { select: { name: true } }, assignees: { select: { userId: true } } },
      orderBy: [{ dueDate: 'asc' }],
    }),
    prisma.companyMembership.findMany({ where: { companyId: opts.companyId }, include: { user: { select: { id: true, name: true } } } }),
  ])
  const nameById = new Map(memberships.map((m) => [m.userId, m.user.name]))

  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const pending = total - done
  const completionRate = total ? Math.round((done / total) * 100) : 0

  const byStatus = STATUS_ORDER
    .map((s) => ({ label: STATUS_LABELS[s], count: tasks.filter((t) => t.status === s).length }))
    .filter((r) => r.count > 0)

  const projMap = new Map<string, { name: string; total: number; done: number }>()
  const asgMap = new Map<string, { name: string; total: number; done: number }>()
  for (const t of tasks) {
    const pe = projMap.get(t.project.name) ?? { name: t.project.name, total: 0, done: 0 }
    pe.total++
    if (t.status === 'done') pe.done++
    projMap.set(t.project.name, pe)

    const names = t.assignees.length ? t.assignees.map((a) => nameById.get(a.userId) ?? '—') : ['Sin responsable']
    for (const n of names) {
      const ae = asgMap.get(n) ?? { name: n, total: 0, done: 0 }
      ae.total++
      if (t.status === 'done') ae.done++
      asgMap.set(n, ae)
    }
  }

  return {
    companyName: opts.companyName,
    projectName: opts.projectName ?? null,
    start: opts.start,
    end: opts.end,
    generatedBy: opts.generatedBy,
    totals: { total, done, pending, completionRate },
    byStatus,
    byProject: [...projMap.values()].sort((a, b) => b.total - a.total),
    byAssignee: [...asgMap.values()].sort((a, b) => b.total - a.total),
    tasks: tasks.map((t) => ({
      title: t.title,
      statusLabel: STATUS_LABELS[t.status as TaskStatus] ?? t.status,
      priorityLabel: PRIORITY_LABELS[t.priority as Priority] ?? t.priority,
      dueDate: t.dueDate,
      projectName: t.project.name,
      assignees: t.assignees.map((a) => nameById.get(a.userId) ?? '—').join(', ') || '—',
    })),
  }
}
