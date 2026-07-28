import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { isProjectViewerServer } from '@/lib/projectAccess'
import { canEditNoteServer, canManageNoteSharingServer, serializeNote } from '@/lib/noteAccess'
import { validAssigneeIds } from '@/app/api/tasks/route'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.note.findFirst({
    where: { id, companyId: session.activeCompanyId },
    include: { shares: { select: { userId: true, role: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (await isProjectViewerServer(session, existing.projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }
  if (!canEditNoteServer(session, existing)) {
    return NextResponse.json({ error: 'Sin permisos: no tienes acceso de edición a esta nota' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['title', 'content', 'color']) {
    if (key in body) data[key] = body[key]
  }

  if (Object.keys(data).length > 0) {
    await prisma.note.update({ where: { id }, data })
  }

  if (Array.isArray(body.shareWith) && canManageNoteSharingServer(session, existing)) {
    const requestedShareIds = body.shareWith.filter((s: { userId?: string }) => s?.userId).map((s: { userId: string }) => s.userId)
    const validShareIds = await validAssigneeIds(session.activeCompanyId, requestedShareIds)
    const roleByUserId = new Map(
      body.shareWith.map((s: { userId: string; role?: string }) => [s.userId, s.role])
    )
    const validShares = validShareIds
      .filter((userId) => userId !== (existing.createdById ?? session.userId))
      .map((userId) => ({ noteId: id, userId, role: roleByUserId.get(userId) === 'editor' ? 'editor' : 'viewer' }))

    await prisma.$transaction([
      prisma.noteShare.deleteMany({ where: { noteId: id } }),
      ...(validShares.length > 0 ? [prisma.noteShare.createMany({ data: validShares })] : []),
    ])
  }

  const note = await prisma.note.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  })
  return NextResponse.json(serializeNote(note!, session.userId))
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.note.findFirst({
    where: { id, companyId: session.activeCompanyId },
    include: { shares: { select: { userId: true, role: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (await isProjectViewerServer(session, existing.projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }
  if (!canEditNoteServer(session, existing)) {
    return NextResponse.json({ error: 'Sin permisos: no tienes acceso de edición a esta nota' }, { status: 403 })
  }

  await prisma.note.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
