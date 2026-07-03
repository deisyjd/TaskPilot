import { prisma } from '@/lib/prisma'

export async function recordHistoryEvent(params: {
  companyId: string
  type: string
  taskId?: string
  taskTitle?: string
  project?: string
  description: string
  user: string
  meta?: Record<string, string>
}) {
  const { companyId, type, taskId, taskTitle, project, description, user, meta } = params
  await prisma.historyEvent.create({
    data: { companyId, type, taskId, taskTitle, project, description, user, meta },
  })
}
