import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordHistoryEvent } from '@/lib/history'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const task = await prisma.task.findFirst({
    where: { id, companyId: session.activeCompanyId },
    include: { checklist: true, comments: true },
  })

  if (!task) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(serializeTask(task))
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.task.findFirst({ where: { id, companyId: session.activeCompanyId } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()

  // Whitelist: el cliente envía campos que no son columnas (attachments, links, coverImageUrl, …)
  const data: Record<string, unknown> = {}
  for (const key of ['title', 'description', 'status', 'assignee', 'dueDate', 'priority', 'type', 'projectId', 'tags']) {
    if (key in body) data[key] = body[key]
  }

  if (data.tags) data.tags = JSON.stringify(data.tags)

  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId as string } })
    if (!project || project.companyId !== session.activeCompanyId) {
      return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 })
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { checklist: true, comments: true },
  })

  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  const userName = actor?.name ?? session.email
  const events: Array<{ type: string; description: string; meta?: Record<string, string> }> = []

  const { status, assignee, dueDate } = data as { status?: string; assignee?: string; dueDate?: string }
  if (status && status !== existing.status) {
    events.push({
      type: status === 'done' ? 'task-completed' : 'status-changed',
      description: `Estado cambiado de ${existing.status} a ${status}`,
      meta: { from: existing.status, to: status },
    })
  }
  if (assignee && assignee !== existing.assignee) {
    events.push({
      type: 'assignee-changed',
      description: `Responsable cambiado a ${assignee}`,
      meta: { from: existing.assignee, to: assignee },
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
      taskId: task.id,
      taskTitle: task.title,
      description: e.description,
      user: userName,
      meta: e.meta,
    })
  }

  return NextResponse.json(serializeTask(task))
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const result = await prisma.task.deleteMany({ where: { id, companyId: session.activeCompanyId } })
  if (result.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

function serializeTask(task: Record<string, unknown> & { tags: unknown }) {
  return {
    ...task,
    tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags,
  }
}
