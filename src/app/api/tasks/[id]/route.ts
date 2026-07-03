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
  const { checklist, comments, companyId: _drop, ...data } = body

  if (data.tags) data.tags = JSON.stringify(data.tags)

  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } })
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

  if (data.status && data.status !== existing.status) {
    events.push({
      type: data.status === 'done' ? 'task-completed' : 'status-changed',
      description: `Estado cambiado de ${existing.status} a ${data.status}`,
      meta: { from: existing.status, to: data.status },
    })
  }
  if (data.assignee && data.assignee !== existing.assignee) {
    events.push({
      type: 'assignee-changed',
      description: `Responsable cambiado a ${data.assignee}`,
      meta: { from: existing.assignee, to: data.assignee },
    })
  }
  if (data.dueDate && data.dueDate !== existing.dueDate) {
    events.push({
      type: 'date-changed',
      description: 'Fecha límite actualizada',
      meta: { from: existing.dueDate, to: data.dueDate },
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
