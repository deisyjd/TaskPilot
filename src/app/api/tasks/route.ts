import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordHistoryEvent } from '@/lib/history'
import { generateDueRecurrences } from '@/lib/recurrence'
import { isProjectViewerServer } from '@/lib/projectAccess'

const RECURRENCE_VALUES = ['daily', 'weekly', 'monthly']

export async function validAssigneeIds(companyId: string, ids: unknown): Promise<string[]> {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const memberships = await prisma.companyMembership.findMany({
    where: { companyId, userId: { in: ids } },
    select: { userId: true },
  })
  return memberships.map((m) => m.userId)
}

export function taskVisibilityFilter(session: { userRole: string; userId: string }) {
  if (session.userRole === 'admin') return {}
  return { OR: [{ assignees: { none: {} } }, { assignees: { some: { userId: session.userId } } }] }
}

// Bloquea editar/eliminar una tarea si: está etiquetado "solo ver" en esa
// tarea puntual, el rol global no permite editar tareas (ej. viewer de
// empresa — cierra un hueco que existía antes, la ruta nunca lo revisaba),
// o el proyecto de la tarea es "solo ver" para este usuario.
export async function canUserEditTaskServer(
  session: { userRole: string; userId: string },
  task: { projectId: string; assignees: { userId: string; role: string }[] }
): Promise<boolean> {
  if (session.userRole === 'admin') return true
  if (session.userRole === 'viewer') return false
  const isTaskViewer = task.assignees.some((a) => a.userId === session.userId && a.role === 'viewer')
  if (isTaskViewer) return false
  return !(await isProjectViewerServer(session, task.projectId))
}

export function serializeTask<T extends { assignees: { userId: string; role: string }[]; tags: unknown }>(task: T) {
  return {
    ...task,
    assigneeIds: task.assignees.map((a) => a.userId),
    viewerAssigneeIds: task.assignees.filter((a) => a.role === 'viewer').map((a) => a.userId),
    tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags,
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await generateDueRecurrences(session.activeCompanyId)

  const tasks = await prisma.task.findMany({
    where: { companyId: session.activeCompanyId, ...taskVisibilityFilter(session) },
    include: { checklist: true, comments: true, assignees: { select: { userId: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tasks.map(serializeTask))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const {
    checklist, comments, projectId, title, description, status, assigneeIds, viewerAssigneeIds, startDate, dueDate, priority, type, tags,
    recurrence, recurrenceInterval, recurrenceUntil, coverImageUrl, attachments, links,
  } = body

  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.companyId !== session.activeCompanyId) {
    return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 })
  }
  if (await isProjectViewerServer(session, projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }

  const hasRecurrence = RECURRENCE_VALUES.includes(recurrence)
  const validIds = await validAssigneeIds(session.activeCompanyId, assigneeIds)
  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  const authorName = actor?.name ?? session.email

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status,
      startDate: startDate || null,
      dueDate,
      priority,
      type,
      projectId,
      companyId: session.activeCompanyId,
      tags: JSON.stringify(tags ?? []),
      coverImageUrl: coverImageUrl || null,
      attachments: Array.isArray(attachments) && attachments.length > 0 ? attachments : undefined,
      links: Array.isArray(links) && links.length > 0 ? links : undefined,
      recurrence: hasRecurrence ? recurrence : null,
      recurrenceInterval: hasRecurrence ? (recurrenceInterval || 1) : null,
      recurrenceUntil: hasRecurrence ? (recurrenceUntil || null) : null,
      checklist: checklist?.length
        ? {
            create: checklist.map((c: { text: string; done?: boolean; assigneeId?: string | null }) => ({
              text: c.text,
              done: Boolean(c.done),
              assigneeId: c.assigneeId && validIds.includes(c.assigneeId) ? c.assigneeId : null,
            })),
          }
        : undefined,
      comments: comments?.length
        ? { create: comments.map((c: { text: string }) => ({ author: authorName, text: c.text })) }
        : undefined,
      assignees: validIds.length
        ? {
            createMany: {
              data: validIds.map((userId) => ({
                userId,
                role: Array.isArray(viewerAssigneeIds) && viewerAssigneeIds.includes(userId) ? 'viewer' : 'editor',
              })),
            },
          }
        : undefined,
    },
    include: { checklist: true, comments: true, assignees: { select: { userId: true, role: true } } },
  })

  await recordHistoryEvent({
    companyId: session.activeCompanyId,
    type: 'task-created',
    taskId: task.id,
    taskTitle: task.title,
    project: project.name,
    description: 'Tarea creada',
    user: authorName,
  })

  // Si es una tarea recurrente, generar de una vez la siguiente ocurrencia
  // en vez de esperar a la próxima carga de la lista.
  if (hasRecurrence) {
    await generateDueRecurrences(session.activeCompanyId)
  }

  return NextResponse.json(serializeTask(task), { status: 201 })
}
