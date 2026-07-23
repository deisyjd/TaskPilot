import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { isProjectViewerServer } from '@/lib/projectAccess'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { projectId, title, content, color } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: session.activeCompanyId },
  })
  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  if (await isProjectViewerServer(session, projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })

  const note = await prisma.note.create({
    data: {
      projectId,
      companyId: session.activeCompanyId,
      title: title ?? '',
      content: content ?? '',
      color,
      createdBy: user?.name,
    },
  })
  return NextResponse.json(note, { status: 201 })
}
