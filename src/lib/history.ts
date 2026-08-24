import { prisma } from '@/lib/prisma'

export type HistoryEventInput = {
  companyId: string
  type: string
  taskId?: string
  taskTitle?: string
  project?: string
  description: string
  user: string
  meta?: Record<string, string>
}

export async function recordHistoryEvent(params: HistoryEventInput) {
  const { companyId, type, taskId, taskTitle, project, description, user, meta } = params
  await prisma.historyEvent.create({
    data: { companyId, type, taskId, taskTitle, project, description, user, meta },
  })
}

// Inserta varios eventos en una sola query (createMany) en vez de N inserts en
// serie. Pensado para llamarse desde after() — el historial no debe bloquear la
// respuesta ni sumar latencia al hot path de escritura.
export async function recordHistoryEvents(events: HistoryEventInput[]) {
  if (events.length === 0) return
  await prisma.historyEvent.createMany({ data: events })
}
