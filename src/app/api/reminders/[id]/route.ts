import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { reminderVisibilityFilter } from '../route'
import { isProjectViewerServer } from '@/lib/projectAccess'

type Params = { params: Promise<{ id: string }> }

function serializeReminder<T extends { project: { name: string; color: string } }>(reminder: T) {
  return { ...reminder, projectName: reminder.project.name, projectColor: reminder.project.color }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.reminder.findFirst({
    where: { id, companyId: session.activeCompanyId, ...reminderVisibilityFilter(session) },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (await isProjectViewerServer(session, existing.projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['title', 'dueDate', 'dueTime', 'done']) {
    if (key in body) data[key] = body[key]
  }

  if ('assigneeId' in body) {
    if (body.assigneeId) {
      const membership = await prisma.companyMembership.findUnique({
        where: { userId_companyId: { userId: body.assigneeId, companyId: session.activeCompanyId } },
      })
      data.assigneeId = membership ? body.assigneeId : null
    } else {
      data.assigneeId = null
    }
  }

  const reminder = await prisma.reminder.update({
    where: { id },
    data,
    include: { project: { select: { name: true, color: true } } },
  })

  return NextResponse.json(serializeReminder(reminder))
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.reminder.findFirst({
    where: { id, companyId: session.activeCompanyId, ...reminderVisibilityFilter(session) },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (await isProjectViewerServer(session, existing.projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }

  await prisma.reminder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
