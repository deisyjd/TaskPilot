import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordHistoryEvent } from '@/lib/history'
import { serializeTask, validAssigneeIds, taskVisibilityFilter } from '../route'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const task = await prisma.task.findFirst({
    where: { id, companyId: session.activeCompanyId, ...taskVisibilityFilter(session) },
    include: { checklist: true, comments: true, assignees: { select: { userId: true } } },
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
    include: { assignees: { select: { userId: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()

  const data: Record<string, unknown> = {}
  for (const key of [
    'title', 'description', 'status', 'dueDate', 'priority', 'type', 'projectId', 'tags',
    'recurrence', 'recurrenceInterval', 'recurrenceUntil', 'coverImageUrl', 'attachments', 'links',
  ]) {
    if (key in body) data[key] = body[key]
  }

  if (data.tags) data.tags = JSON.stringify(data.tags)

  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId as string } })
    if (!project || project.companyId !== session.activeCompanyId) {
      return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 })
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.task.update({ where: { id }, data })
  }

  if (Array.isArray(body.checklist)) {
    await prisma.$transaction([
      prisma.checklistItem.deleteMany({ where: { taskId: id } }),
      ...(body.checklist.length > 0
        ? [
            prisma.checklistItem.createMany({
              data: body.checklist.map((c: { text: string; done?: boolean }) => ({
                taskId: id,
                text: c.text,
                done: Boolean(c.done),
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

  const oldIds = existing.assignees.map((a) => a.userId)
  let newIds = oldIds
  let assigneeChanged = false

  if (Array.isArray(body.assigneeIds)) {
    newIds = await validAssigneeIds(session.activeCompanyId, body.assigneeIds)
    assigneeChanged = JSON.stringify([...oldIds].sort()) !== JSON.stringify([...newIds].sort())
    if (assigneeChanged) {
      await prisma.$transaction([
        prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
        ...(newIds.length > 0
          ? [prisma.taskAssignee.createMany({ data: newIds.map((userId) => ({ taskId: id, userId })) })]
          : []),
      ])
    }
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: { checklist: true, comments: true, assignees: { select: { userId: true } } },
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

  for (const e of events) {
    await recordHistoryEvent({
      companyId: session.activeCompanyId,
      type: e.type,
      taskId: task!.id,
      taskTitle: task!.title,
      description: e.description,
      user: userName,
      meta: e.meta,
    })
  }

  return NextResponse.json(serializeTask(task!))
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const result = await prisma.task.deleteMany({
    where: { id, companyId: session.activeCompanyId, ...taskVisibilityFilter(session) },
  })
  if (result.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
