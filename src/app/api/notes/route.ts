import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { isProjectViewerServer } from '@/lib/projectAccess'
import { serializeNote } from '@/lib/noteAccess'
import { sanitizeNoteHtml } from '@/lib/richText'
import { validAssigneeIds } from '@/app/api/tasks/route'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { projectId, title, content, color, shareWith } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: session.activeCompanyId },
  })
  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  if (await isProjectViewerServer(session, projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })

  const requestedShareIds = Array.isArray(shareWith)
    ? shareWith.filter((s: { userId?: string }) => s?.userId).map((s: { userId: string }) => s.userId)
    : []
  const validShareIds = await validAssigneeIds(session.activeCompanyId, requestedShareIds)
  const roleByUserId = new Map(
    Array.isArray(shareWith) ? shareWith.map((s: { userId: string; role?: string }) => [s.userId, s.role]) : []
  )
  const validShares = validShareIds
    .filter((userId) => userId !== session.userId)
    .map((userId) => ({ userId, role: roleByUserId.get(userId) === 'editor' ? 'editor' : 'viewer' }))

  const note = await prisma.note.create({
    data: {
      projectId,
      companyId: session.activeCompanyId,
      title: title ?? '',
      content: sanitizeNoteHtml(content ?? ''),
      color,
      createdBy: user?.name,
      createdById: session.userId,
      shares: validShares.length > 0 ? { createMany: { data: validShares } } : undefined,
    },
    include: { shares: { select: { userId: true, role: true } } },
  })
  return NextResponse.json(serializeNote(note, session.userId), { status: 201 })
}
