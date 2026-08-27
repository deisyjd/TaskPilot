import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordHistoryEvents } from '@/lib/history'
import { serializeTask, validAssigneeIds, taskVisibilityFilter, canUserEditTaskServer } from '../route'
import { notifyTaskAssigned } from '@/lib/taskAssignedNotification'
import { pickFields } from '@/lib/apiBody'
import { sanitizeNoteHtml } from '@/lib/richText'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const task = await prisma.task.findFirst({
    where: { id, companyId: session.activeCompanyId, ...taskVisibilityFilter(session) },
    include: { checklist: true, comments: true, assignees: { select: { userId: true, role: true } } },
  })

  if (!task) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(serializeTask(task))
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.task.findFirst({
    where: { id, companyId: session.activeCompanyId, ...taskVisibilityFilter(session) },
    include: { assignees: { select: { userId: true, role: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!(await canUserEditTaskServer(session, existing))) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver esta tarea' }, { status: 403 })
  }

  const body = await req.json()

  // description/coverImageUrl/startDate/dueTime son nullables: '' → null para limpiarlos.
  const data = pickFields(
    body,
    [
      'title', 'description', 'status', 'startDate', 'dueDate', 'dueTime', 'priority', 'type', 'projectId', 'tags',
      'recurrence', 'recurrenceInterval', 'recurrenceUntil', 'coverImageUrl', 'attachments', 'links',
    ],
    ['description', 'coverImageUrl', 'startDate', 'dueTime']
  )

  if (data.tags) data.tags = JSON.stringify(data.tags)
  // El HTML de la descripción puede venir de cualquier cliente (no solo del
  // editor de la app) — se sanea igual que el contenido de las notas.
  if (typeof data.description === 'string') data.description = sanitizeNoteHtml(data.description)

  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId as string } })
    if (!project || project.companyId !== session.activeCompanyId) {
      return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 })
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.task.update({ where: { id }, data })
  }

  const oldIds = existing.assignees.map((a) => a.userId)
  let newIds = oldIds
  let assigneeChanged = false
  let addedIds: string[] = []

  if (Array.isArray(body.assigneeIds)) {
    newIds = await validAssigneeIds(session.activeCompanyId, body.assigneeIds)
    const viewerIds: string[] = Array.isArray(body.viewerAssigneeIds) ? body.viewerAssigneeIds : []
    const oldRoles = new Map(existing.assignees.map((a) => [a.userId, a.role]))
    const roleFor = (userId: string) => (viewerIds.includes(userId) ? 'viewer' : 'editor')
    assigneeChanged = JSON.stringify([...oldIds].sort()) !== JSON.stringify([...newIds].sort())
    const rolesChanged = newIds.some((userId) => (oldRoles.get(userId) ?? 'editor') !== roleFor(userId))
    addedIds = newIds.filter((userId) => !oldIds.includes(userId))
    if (assigneeChanged || rolesChanged) {
      await prisma.$transaction([
        prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
        ...(newIds.length > 0
          ? [prisma.taskAssignee.createMany({ data: newIds.map((userId) => ({ taskId: id, userId, role: roleFor(userId) })) })]
          : []),
      ])
      for (const userId of addedIds) {
        after(() =>
          notifyTaskAssigned(id, userId, session.userId).catch((err) =>
            console.error('[task-assigned] error en notificación:', err)
          )
        )
      }
    }
  }

  if (Array.isArray(body.checklist)) {
    // Un ítem del checklist solo puede etiquetar a alguien que sea
    // responsable de la tarea (con el set de responsables ya actualizado).
    await prisma.$transaction([
      prisma.checklistItem.deleteMany({ where: { taskId: id } }),
      ...(body.checklist.length > 0
        ? [
            prisma.checklistItem.createMany({
              data: body.checklist.map((c: { text: string; done?: boolean; dueDate?: string | null; dueTime?: string | null; assigneeId?: string | null }) => ({
                taskId: id,
                text: c.text,
                done: Boolean(c.done),
                dueDate: c.dueDate || null,
                dueTime: c.dueTime || null,
                assigneeId: c.assigneeId && newIds.includes(c.assigneeId) ? c.assigneeId : null,
              })),
            }),
          ]
        : []),
    ])
  }

  if (Array.isArray(body.comments)) {
    const existingCommentIds = new Set(
      (await prisma.comment.findMany({ where: { taskId: id }, select: { id: true } })).map((c) => c.id)
    )
    const newComments = body.comments.filter(
      (c: { id?: string; text: string }) => !c.id || !existingCommentIds.has(c.id)
    )
    if (newComments.length > 0) {
      const actorForComment = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })
      await prisma.comment.createMany({
        data: newComments.map((c: { text: string }) => ({
          taskId: id,
          author: actorForComment?.name ?? session.email,
          text: c.text,
        })),
      })
    }
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: { checklist: true, comments: true, assignees: { select: { userId: true, role: true } } },
  })

  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  const userName = actor?.name ?? session.email
  const events: Array<{ type: string; description: string; meta?: Record<string, string> }> = []

  const { status, dueDate } = data as { status?: string; dueDate?: string }
  if (status && status !== existing.status) {
    events.push({
      type: status === 'done' ? 'task-completed' : 'status-changed',
      description: `Estado cambiado de ${existing.status} a ${status}`,
      meta: { from: existing.status, to: status },
    })
  }
  if (assigneeChanged) {
    const [oldUsers, newUsers] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: oldIds } }, select: { name: true } }),
      prisma.user.findMany({ where: { id: { in: newIds } }, select: { name: true } }),
    ])
    events.push({
      type: 'assignee-changed',
      description: `Responsables actualizados: ${newUsers.map((u) => u.name).join(', ') || 'sin asignar'}`,
      meta: {
        from: JSON.stringify(oldUsers.map((u) => u.name)),
        to: JSON.stringify(newUsers.map((u) => u.name)),
      },
    })
  }
  if (dueDate && dueDate !== existing.dueDate) {
    events.push({
      type: 'date-changed',
      description: 'Fecha límite actualizada',
      meta: { from: existing.dueDate, to: dueDate },
    })
  }
  if (events.length === 0) {
    events.push({ type: 'task-edited', description: 'Tarea editada' })
  }

  const historyEvents = events.map((e) => ({
    companyId: session.activeCompanyId,
    type: e.type,
    taskId: task!.id,
    taskTitle: task!.title,
    description: e.description,
    user: userName,
    meta: e.meta,
  }))
  // El historial no bloquea la respuesta: una sola query (createMany) en after()
  // en vez de N inserts en serie dentro del request.
  after(() =>
    recordHistoryEvents(historyEvents).catch((err) =>
      console.error('[history] error registrando eventos de edición:', err)
    )
  )

  return NextResponse.json(serializeTask(task!))
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.task.findFirst({
    where: { id, companyId: session.activeCompanyId, ...taskVisibilityFilter(session) },
    include: { assignees: { select: { userId: true, role: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!(await canUserEditTaskServer(session, existing))) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver esta tarea' }, { status: 403 })
  }

  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
