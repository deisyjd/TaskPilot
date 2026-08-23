import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { taskVisibilityFilter } from '@/app/api/tasks/route'
import { STATUS_LABELS, PRIORITY_LABELS, TaskStatus, Priority } from '@/types'

// Agrega el "avance" de una empresa (o de uno/varios proyectos) en un rango de
// fechas. Se filtra por dueDate dentro del rango y respeta la visibilidad del
// usuario que genera el reporte.

// Colores (hex) por estado — equivalentes a las clases Tailwind del tablero,
// para pintar las gráficas del correo y del PDF de forma consistente.
export const STATUS_HEX: Record<TaskStatus, string> = {
  pending: '#9CA3AF',
  'in-progress': '#3B82F6',
  review: '#F59E0B',
  scheduled: '#8B5CF6',
  done: '#22C55E',
  blocked: '#EF4444',
}

export interface ReportChecklistRow {
  text: string
  done: boolean
  dueDate: string | null
  assignee: string | null
}

export interface ReportTaskRow {
  title: string
  statusLabel: string
  statusColor: string
  priorityLabel: string
  dueDate: string
  projectName: string
  assignees: string
  checklist: ReportChecklistRow[]
}

export interface ReportData {
  companyName: string
  scopeLabel: string
  start: string
  end: string
  generatedBy: string
  totals: { total: number; done: number; pending: number; completionRate: number }
  byStatus: { label: string; count: number; color: string }[]
  byProject: { name: string; total: number; done: number; color: string; logoUrl: string | null }[]
  byAssignee: { name: string; total: number; done: number }[]
  tasks: ReportTaskRow[]
}

interface BuildOpts {
  userId: string
  userRole: string
  companyId: string
  companyName: string
  projectIds: string[] | null // null = todos los proyectos de la empresa
  scopeLabel: string
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
  if (opts.projectIds && opts.projectIds.length > 0) where.projectId = { in: opts.projectIds }

  const [tasks, memberships] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        project: { select: { name: true, color: true, logoUrl: true } },
        assignees: { select: { userId: true } },
        checklist: { select: { text: true, done: true, dueDate: true, assigneeId: true } },
      },
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
    .map((s) => ({ label: STATUS_LABELS[s], count: tasks.filter((t) => t.status === s).length, color: STATUS_HEX[s] }))
    .filter((r) => r.count > 0)

  const projMap = new Map<string, { name: string; total: number; done: number; color: string; logoUrl: string | null }>()
  const asgMap = new Map<string, { name: string; total: number; done: number }>()
  for (const t of tasks) {
    const pe = projMap.get(t.project.name) ?? { name: t.project.name, total: 0, done: 0, color: t.project.color, logoUrl: t.project.logoUrl }
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
    scopeLabel: opts.scopeLabel,
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
      statusColor: STATUS_HEX[t.status as TaskStatus] ?? '#6B7280',
      priorityLabel: PRIORITY_LABELS[t.priority as Priority] ?? t.priority,
      dueDate: t.dueDate,
      projectName: t.project.name,
      assignees: t.assignees.map((a) => nameById.get(a.userId) ?? '—').join(', ') || '—',
      checklist: t.checklist.map((c) => ({
        text: c.text,
        done: c.done,
        dueDate: c.dueDate,
        assignee: c.assigneeId ? nameById.get(c.assigneeId) ?? null : null,
      })),
    })),
  }
}
