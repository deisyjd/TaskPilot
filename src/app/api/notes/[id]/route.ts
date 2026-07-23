import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { isProjectViewerServer } from '@/lib/projectAccess'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.note.findFirst({ where: { id, companyId: session.activeCompanyId } })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (await isProjectViewerServer(session, existing.projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['title', 'content', 'color']) {
    if (key in body) data[key] = body[key]
  }

  await prisma.note.update({ where: { id }, data })
  const note = await prisma.note.findUnique({ where: { id } })
  return NextResponse.json(note)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.note.findFirst({ where: { id, companyId: session.activeCompanyId } })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  if (await isProjectViewerServer(session, existing.projectId)) {
    return NextResponse.json({ error: 'Sin permisos: solo puedes ver este proyecto' }, { status: 403 })
  }

  await prisma.note.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
