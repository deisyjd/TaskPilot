import { prisma } from '@/lib/prisma'

const MAX_GENERATED_PER_TEMPLATE = 120

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateOnly(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function advanceDate(dateStr: string, recurrence: string, interval: number): string {
  const date = parseDateOnly(dateStr)
  if (recurrence === 'daily') date.setDate(date.getDate() + interval)
  else if (recurrence === 'monthly') date.setMonth(date.getMonth() + interval)
  else if (recurrence === 'yearly') date.setFullYear(date.getFullYear() + interval)
  return formatDateOnly(date)
}

function todayStr(): string {
  return formatDateOnly(new Date())
}

/**
 * Igual patrón que la recurrencia de tareas (src/lib/recurrence.ts): no hay
 * cron en esta app, así que GET /api/reminders (y la creación de un
 * recordatorio recurrente) son los puntos donde se generan las próximas
 * ocurrencias, hasta `recurrenceUntil` o 3 meses/años por defecto si no
 * tiene fecha límite.
 */
export async function generateDueReminderRecurrences(companyId: string) {
  const today = todayStr()

  const templates = await prisma.reminder.findMany({
    where: {
      companyId,
      parentReminderId: null,
      recurrence: { not: null },
      OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: today } }],
    },
  })

  await Promise.all(templates.map(async (template) => {
    const recurrence = template.recurrence
    if (!recurrence) return
    const interval = template.recurrenceInterval ?? 1

    const existingOccurrences = await prisma.reminder.findMany({
      where: { parentReminderId: template.id },
      select: { dueDate: true },
      orderBy: { dueDate: 'desc' },
    })
    const existingDates = new Set(existingOccurrences.map((o) => o.dueDate))

    const horizon = template.recurrenceUntil || advanceDate(today, recurrence === 'yearly' ? 'yearly' : 'monthly', recurrence === 'yearly' ? 1 : 3)
    let lastDueDate = existingOccurrences[0]?.dueDate ?? template.dueDate
    let generated = 0

    while (generated < MAX_GENERATED_PER_TEMPLATE) {
      const nextDate = advanceDate(lastDueDate, recurrence, interval)
      if (nextDate > horizon) break

      if (!existingDates.has(nextDate)) {
        await prisma.reminder.create({
          data: {
            companyId: template.companyId,
            projectId: template.projectId,
            title: template.title,
            dueDate: nextDate,
            dueTime: template.dueTime,
            assigneeId: template.assigneeId,
            createdBy: template.createdBy,
            parentReminderId: template.id,
          },
        })
      }

      lastDueDate = nextDate
      generated++
    }
  }))
}
