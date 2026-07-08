import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { taskVisibilityFilter } from '@/app/api/tasks/route'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = Number(searchParams.get('year')) || now.getFullYear()
  const month = Number(searchParams.get('month')) || now.getMonth() + 1

  const start = `${year}-${pad(month)}-01`
  const end = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: session.userId },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  })

  const companies = await Promise.all(
    memberships.map(async (m) => {
      const [tasks, memberRows] = await Promise.all([
        prisma.task.findMany({
          where: {
            companyId: m.companyId,
            dueDate: { gte: start, lte: end },
            ...taskVisibilityFilter({ userRole: m.role, userId: session.userId }),
          },
          include: {
            checklist: { select: { id: true, done: true, assigneeId: true } },
            assignees: { select: { userId: true } },
            project: { select: { id: true, name: true, color: true } },
          },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.companyMembership.findMany({
          where: { companyId: m.companyId },
          include: { user: true },
        }),
      ])

      return {
        id: m.company.id,
        name: m.company.name,
        color: m.company.color,
        users: memberRows
          .filter((r) => r.user.status === 'active')
          .map((r) => ({ id: r.user.id, name: r.user.name, initials: r.user.initials, color: r.user.color })),
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
          priority: t.priority,
          projectId: t.projectId,
          projectName: t.project.name,
          projectColor: t.project.color,
          assigneeIds: t.assignees.map((a) => a.userId),
          checklist: t.checklist.map((c) => ({ id: c.id, done: c.done, assigneeId: c.assigneeId })),
        })),
      }
    })
  )

  return NextResponse.json({ year, month, companies })
}
