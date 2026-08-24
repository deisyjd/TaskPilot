import { prisma } from '@/lib/prisma'
import { generateDueRecurrences } from '@/lib/recurrence'
import { generateDueReminderRecurrences } from '@/lib/reminderRecurrence'

/**
 * Genera las ocurrencias pendientes de tareas y recordatorios recurrentes de
 * TODAS las empresas que tengan al menos una plantilla activa.
 *
 * Antes esto corría dentro de GET /api/tasks y GET /api/reminders — es decir,
 * cada lectura disparaba escrituras, y bajo concurrencia N lectores de la
 * misma empresa lo ejecutaban en paralelo. Ahora es un job diario, único e
 * idempotente (el índice único (parent, dueDate) impide duplicados). Se
 * procesa empresa por empresa en serie para no saturar el pool de conexiones.
 */
export async function runRecurrenceGenerationJob() {
  const [taskCompanies, reminderCompanies] = await Promise.all([
    prisma.task.findMany({
      where: { parentTaskId: null, recurrence: { not: null } },
      select: { companyId: true },
      distinct: ['companyId'],
    }),
    prisma.reminder.findMany({
      where: { parentReminderId: null, recurrence: { not: null } },
      select: { companyId: true },
      distinct: ['companyId'],
    }),
  ])

  const companyIds = new Set<string>([
    ...taskCompanies.map((c) => c.companyId),
    ...reminderCompanies.map((c) => c.companyId),
  ])

  console.log(`[recurrence] generando ocurrencias para ${companyIds.size} empresa(s)`)

  for (const companyId of companyIds) {
    try {
      await generateDueRecurrences(companyId)
      await generateDueReminderRecurrences(companyId)
    } catch (err) {
      console.error(`[recurrence] error generando para empresa ${companyId}:`, err)
    }
  }
}
