import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordHistoryEvent } from '@/lib/history'
import { serializeTask, taskVisibilityFilter } from '../../route'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const original = await prisma.task.findFirst({
    where: { id, companyId: session.activeCompanyId, ...taskVisibilityFilter(session) },
    include: { checklist: true, assignees: { select: { userId: true } } },
  })
  if (!original) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const duplicate = await prisma.task.create({
    data: {
      companyId: original.companyId,
      projectId: original.projectId,
      title: `${original.title} (copia)`,
      description: original.description,
      status: 'pending',
      startDate: original.startDate,
      dueDate: original.dueDate,
      priority: original.priority,
      type: original.type,
      tags: original.tags ?? '[]',
      coverImageUrl: original.coverImageUrl,
      attachments: original.attachments ?? undefined,
      links: original.links ?? undefined,
      // La duplicada no hereda comentarios ni recurrencia — empieza como
      // una tarea normal e independiente.
      checklist: original.checklist.length
        ? { create: original.checklist.map((c) => ({ text: c.text, done: false })) }
        : undefined,
      assignees: original.assignees.length
        ? { createMany: { data: original.assignees.map((a) => ({ userId: a.userId })) } }
        : undefined,
    },
    include: { checklist: true, comments: true, assignees: { select: { userId: true } } },
  })

  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  const project = await prisma.project.findUnique({ where: { id: original.projectId } })
  await recordHistoryEvent({
    companyId: session.activeCompanyId,
    type: 'task-created',
    taskId: duplicate.id,
    taskTitle: duplicate.title,
    project: project?.name,
    description: `Tarea duplicada de "${original.title}"`,
    user: actor?.name ?? session.email,
  })

  return NextResponse.json(serializeTask(duplicate), { status: 201 })
}
