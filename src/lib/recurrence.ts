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
  else if (recurrence === 'weekly') date.setDate(date.getDate() + interval * 7)
  else if (recurrence === 'monthly') date.setMonth(date.getMonth() + interval)
  return formatDateOnly(date)
}

function todayStr(): string {
  return formatDateOnly(new Date())
}

function daysBetween(fromStr: string, toStr: string): number {
  const ms = parseDateOnly(toStr).getTime() - parseDateOnly(fromStr).getTime()
  return Math.round(ms / 86400000)
}

function shiftDate(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr)
  date.setDate(date.getDate() + days)
  return formatDateOnly(date)
}

/**
 * Generates every occurrence of a recurring task up to its end date
 * (`recurrenceUntil`), not just the next one — so a "cada 7 días hasta
 * diciembre" series shows the whole calendar right away instead of one
 * task appearing at a time as the weeks go by.
 *
 * There is no cron/worker in this app — GET /api/tasks (and task
 * creation) are the reliable hooks that fire on every real page load,
 * so generation happens here instead. Series with no `recurrenceUntil`
 * only pre-generate 3 months ahead, to avoid an unbounded series from
 * writing rows forever; `MAX_GENERATED_PER_TEMPLATE` is a hard backstop
 * on top of that.
 */
export async function generateDueRecurrences(companyId: string) {
  const today = todayStr()

  // Excluye series con recurrenceUntil ya vencido: nunca van a generar nada
  // nuevo, pero sin este filtro se siguen consultando en cada carga para
  // siempre — un costo que solo crece con los meses de uso de la empresa.
  const templates = await prisma.task.findMany({
    where: {
      companyId,
      parentTaskId: null,
      recurrence: { not: null },
      OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: today } }],
    },
    include: { assignees: { select: { userId: true } } },
  })

  // Cada plantilla es independiente de las demás — se procesan en paralelo
  // en vez de una por una, para no sumar una ronda de latencia de red por
  // cada tarea recurrente que la empresa tenga acumulada.
  await Promise.all(templates.map(async (template) => {
    const recurrence = template.recurrence
    if (!recurrence) return
    const interval = template.recurrenceInterval ?? 1

    const existingOccurrences = await prisma.task.findMany({
      where: { parentTaskId: template.id },
      select: { dueDate: true },
      orderBy: { dueDate: 'desc' },
    })
    const existingDates = new Set(existingOccurrences.map((o) => o.dueDate))

    const horizon = template.recurrenceUntil || advanceDate(today, 'monthly', 3)
    let lastDueDate = existingOccurrences[0]?.dueDate ?? template.dueDate
    let generated = 0
    // Preserva cuántos días dura la tarea (inicio → fin) en cada ocurrencia generada.
    const durationDays = template.startDate ? daysBetween(template.startDate, template.dueDate) : null

    while (generated < MAX_GENERATED_PER_TEMPLATE) {
      const nextDate = advanceDate(lastDueDate, recurrence, interval)
      if (nextDate > horizon) break

      if (!existingDates.has(nextDate)) {
        await prisma.task.create({
          data: {
            companyId: template.companyId,
            projectId: template.projectId,
            title: template.title,
            description: template.description,
            status: 'pending',
            startDate: durationDays !== null ? shiftDate(nextDate, -durationDays) : null,
            dueDate: nextDate,
            priority: template.priority,
            type: template.type,
            tags: template.tags ?? '[]',
            parentTaskId: template.id,
            assignees: template.assignees.length
              ? { createMany: { data: template.assignees.map((a) => ({ userId: a.userId })) } }
              : undefined,
          },
        })
      }

      lastDueDate = nextDate
      generated++
    }
  }))
}
