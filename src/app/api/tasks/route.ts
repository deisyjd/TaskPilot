import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { recordHistoryEvent } from '@/lib/history'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const tasks = await prisma.task.findMany({
    where: { companyId: session.activeCompanyId },
    include: { checklist: true, comments: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tasks.map(serializeTask))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { checklist, comments, companyId: _drop, projectId, ...data } = body

  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.companyId !== session.activeCompanyId) {
    return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 })
  }

  const task = await prisma.task.create({
    data: {
      ...data,
      projectId,
      companyId: session.activeCompanyId,
      tags: JSON.stringify(data.tags ?? []),
      checklist: checklist?.length
        ? { create: checklist.map(({ id: _id, ...c }: { id?: string; text: string; done: boolean }) => c) }
        : undefined,
    },
    include: { checklist: true, comments: true },
  })

  const actor = await prisma.user.findUnique({ where: { id: session.userId } })
  await recordHistoryEvent({
    companyId: session.activeCompanyId,
    type: 'task-created',
    taskId: task.id,
    taskTitle: task.title,
    project: project.name,
    description: 'Tarea creada',
    user: actor?.name ?? session.email,
  })

  return NextResponse.json(serializeTask(task), { status: 201 })
}

function serializeTask(task: Record<string, unknown> & { tags: unknown }) {
  return {
    ...task,
    tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags,
  }
}
