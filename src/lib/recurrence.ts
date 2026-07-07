import { prisma } from '@/lib/prisma'

const MAX_GENERATED_PER_TEMPLATE = 30

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

/**
 * Lazily generates due occurrences of recurring tasks for a company.
 * There is no cron/worker in this app — GET /api/tasks is the one
 * reliable hook that fires on every real page load, so recurrence
 * catch-up happens here instead.
 */
export async function generateDueRecurrences(companyId: string) {
  const templates = await prisma.task.findMany({
    where: { companyId, parentTaskId: null, recurrence: { not: null } },
    include: { assignees: { select: { userId: true } } },
  })

  const today = todayStr()

  for (const template of templates) {
    const recurrence = template.recurrence
    if (!recurrence) continue
    const interval = template.recurrenceInterval ?? 1

    const lastOccurrence = await prisma.task.findFirst({
      where: { parentTaskId: template.id },
      orderBy: { dueDate: 'desc' },
    })

    // Si la serie todavía no generó ninguna ocurrencia, se crea la
    // siguiente de una vez (aunque su fecha sea futura) para que se vea
    // completa desde que se crea, en vez de esperar a que la fecha de la
    // plantilla ya haya pasado.
    const isFirstRun = !lastOccurrence
    let lastDueDate = lastOccurrence?.dueDate ?? template.dueDate
    let generated = 0

    while (generated < MAX_GENERATED_PER_TEMPLATE) {
      const nextDate = advanceDate(lastDueDate, recurrence, interval)
      if (template.recurrenceUntil && nextDate > template.recurrenceUntil) break
      if (nextDate > today && !(isFirstRun && generated === 0)) break

      const alreadyExists = await prisma.task.findFirst({
        where: { parentTaskId: template.id, dueDate: nextDate },
        select: { id: true },
      })
      if (!alreadyExists) {
        await prisma.task.create({
          data: {
            companyId: template.companyId,
            projectId: template.projectId,
            title: template.title,
            description: template.description,
            status: 'pending',
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
  }
}
