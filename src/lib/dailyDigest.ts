import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { renderDailyDigestEmail, DigestTaskRow, DigestProjectRow } from '@/lib/emailTemplates/dailyDigest'
import { isOverdue, isToday, getWeekDays, parseLocal, formatDate } from '@/lib/dates'
import { Priority, TaskStatus } from '@/types'

const WEEKDAY_LABEL = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

async function buildDigestForUser(userId: string, appUrl: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const tasks = await prisma.task.findMany({
    where: { assignees: { some: { userId } } },
    include: { project: true },
  })

  const active = tasks.filter((t) => t.status !== 'done')
  const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status))
  const todayTasks = tasks.filter((t) => isToday(t.dueDate) && t.status !== 'done')
  const publications = tasks.filter((t) => t.type === 'publication' && t.status !== 'done')

  const [monday, , , , , , sunday] = getWeekDays(0)
  const dueThisWeek = tasks.filter((t) => {
    const d = parseLocal(t.dueDate)
    return d >= monday && d <= sunday
  })
  const completedThisWeek = dueThisWeek.filter((t) => t.status === 'done')

  const now = new Date()
  const in2Days = new Date(now)
  in2Days.setDate(now.getDate() + 2)
  in2Days.setHours(23, 59, 59, 999)
  const upcomingPublications = tasks.filter(
    (t) => t.type === 'publication' && t.status !== 'done' && parseLocal(t.dueDate) <= in2Days && parseLocal(t.dueDate) >= now
  ).length

  const pendingReviews = tasks.filter((t) => t.status === 'review').length

  const rows: DigestTaskRow[] = [...overdueTasks, ...todayTasks]
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .sort((a, b) => {
      const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority as Priority] - priorityOrder[b.priority as Priority]
    })
    .map((t) => {
      const overdue = isOverdue(t.dueDate, t.status)
      return {
        title: t.title,
        projectName: t.project.name,
        projectColor: t.project.color,
        meta: overdue ? `Venció el ${formatDate(t.dueDate)}` : 'Vence hoy',
        status: t.status as TaskStatus,
        priority: t.priority as Priority,
        overdue,
      }
    })

  const projectMap = new Map<string, DigestProjectRow>()
  for (const t of active) {
    if (!projectMap.has(t.projectId)) {
      projectMap.set(t.projectId, { name: t.project.name, color: t.project.color, pendingCount: 0 })
    }
    projectMap.get(t.projectId)!.pendingCount += 1
  }

  const percent = dueThisWeek.length === 0 ? 100 : Math.round((completedThisWeek.length / dueThisWeek.length) * 100)

  const html = renderDailyDigestEmail({
    recipientName: user.name,
    dateLabel: WEEKDAY_LABEL.format(now),
    appUrl,
    metrics: {
      active: active.length,
      overdue: overdueTasks.length,
      today: todayTasks.length,
      publications: publications.length,
    },
    tasks: rows,
    weekly: { completed: completedThisWeek.length, total: dueThisWeek.length, percent },
    upcomingPublications,
    pendingReviews,
    projects: Array.from(projectMap.values()).sort((a, b) => b.pendingCount - a.pendingCount),
  })

  return { user, html }
}

export async function sendDailyDigestToUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const appUrl = process.env.APP_URL || 'https://wipli.adminainoa.com'
  const built = await buildDigestForUser(userId, appUrl)
  if (!built) return { ok: false, error: 'Usuario no encontrado' }

  try {
    await sendMail({
      to: built.user.email,
      subject: 'Wipli · Tu resumen diario',
      html: built.html,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function runDailyDigestJob() {
  const now = new Date()
  if (!isBusinessDay(now)) {
    console.log('[daily-digest] omitido: hoy no es día hábil')
    return
  }

  const users = await prisma.user.findMany({
    where: { dailyDigestEmail: true, status: 'active' },
    select: { id: true, email: true },
  })

  console.log(`[daily-digest] enviando a ${users.length} usuario(s)`)

  for (const user of users) {
    const result = await sendDailyDigestToUser(user.id)
    if (result.ok) {
      console.log(`[daily-digest] enviado a ${user.email}`)
    } else {
      console.error(`[daily-digest] error enviando a ${user.email}: ${result.error}`)
    }
  }
}
