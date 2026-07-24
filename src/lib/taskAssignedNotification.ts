import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { renderTaskAssignedEmail } from '@/lib/emailTemplates/taskAssigned'
import { formatDate } from '@/lib/dates'
import { PRIORITY_LABELS, Priority } from '@/types'

export async function notifyTaskAssigned(taskId: string, assigneeUserId: string, assignedByUserId: string) {
  if (assigneeUserId === assignedByUserId) return

  const assignee = await prisma.user.findUnique({ where: { id: assigneeUserId } })
  if (!assignee || !assignee.taskAssignedEmail) return

  const [task, assignedBy, commentCount] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId }, include: { project: { include: { company: true } } } }),
    prisma.user.findUnique({ where: { id: assignedByUserId } }),
    prisma.comment.count({ where: { taskId } }),
  ])
  if (!task) return

  const appUrl = process.env.APP_URL || 'https://wipli.adminainoa.com'

  const html = renderTaskAssignedEmail({
    recipientName: assignee.name,
    assignedByName: assignedBy?.name ?? 'Alguien de tu equipo',
    companyName: task.project.company.name,
    projectName: task.project.name,
    projectColor: task.project.color,
    taskTitle: task.title,
    dueDateLabel: task.dueDate ? formatDate(task.dueDate) : null,
    priorityLabel: PRIORITY_LABELS[task.priority as Priority] ?? task.priority,
    hasDescription: Boolean(task.description && task.description.trim()),
    commentCount,
    taskUrl: `${appUrl}/board?task=${task.id}`,
  })

  try {
    await sendMail({
      to: assignee.email,
      subject: `Wipli · Nueva tarea asignada: ${task.title}`,
      html,
    })
  } catch (err) {
    console.error(`[task-assigned] error notificando a ${assignee.email}:`, err)
  }
}
