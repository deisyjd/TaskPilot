import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export function reminderVisibilityFilter(session: { userRole: string; userId: string }) {
  if (session.userRole === 'admin') return {}
  return {
    OR: [{ assigneeId: null }, { assigneeId: session.userId }],
    project: { OR: [{ members: { none: {} } }, { members: { some: { userId: session.userId } } }] },
  }
}

function serializeReminder<T extends { project: { name: string; color: string } }>(reminder: T) {
  return { ...reminder, projectName: reminder.project.name, projectColor: reminder.project.color }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const reminders = await prisma.reminder.findMany({
    where: { companyId: session.activeCompanyId, ...reminderVisibilityFilter(session) },
    include: { project: { select: { name: true, color: true } } },
    orderBy: { dueDate: 'asc' },
  })

  return NextResponse.json(reminders.map(serializeReminder))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { projectId, title, dueDate, dueTime, assigneeId } = await req.json()
  if (!projectId || !title?.trim() || !dueDate) {
    return NextResponse.json({ error: 'projectId, title y dueDate son requeridos' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.companyId !== session.activeCompanyId) {
    return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 })
  }

  let validAssigneeId: string | null = null
  if (assigneeId) {
    const membership = await prisma.companyMembership.findUnique({
      where: { userId_companyId: { userId: assigneeId, companyId: session.activeCompanyId } },
    })
    if (membership) validAssigneeId = assigneeId
  }

  const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })

  const reminder = await prisma.reminder.create({
    data: {
      companyId: session.activeCompanyId,
      projectId,
      title: title.trim(),
      dueDate,
      dueTime: dueTime || null,
      assigneeId: validAssigneeId,
      createdBy: actor?.name ?? session.email,
    },
    include: { project: { select: { name: true, color: true } } },
  })

  return NextResponse.json(serializeReminder(reminder), { status: 201 })
}
