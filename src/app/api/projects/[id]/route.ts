import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { serializeProject } from '../route'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const exists = await prisma.project.findFirst({ where: { id, companyId: session.activeCompanyId } })
  if (!exists) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isOwner = exists.createdById === session.userId
  if (session.userRole !== 'admin' && !isOwner) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Whitelist: el cliente envía campos que no son columnas (createdBy, …)
  const data: Record<string, unknown> = {}
  for (const key of ['name', 'description', 'color', 'status', 'featured', 'coverImageUrl']) {
    if (key in body) data[key] = body[key]
  }

  if (Object.keys(data).length > 0) {
    await prisma.project.update({ where: { id }, data })
  }

  if (Array.isArray(body.memberIds)) {
    await prisma.$transaction([
      prisma.projectMember.deleteMany({ where: { projectId: id } }),
      ...(body.memberIds.length > 0
        ? [
            prisma.projectMember.createMany({
              data: body.memberIds.map((userId: string) => ({ projectId: id, userId })),
            }),
          ]
        : []),
    ])
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: { notes: true, members: { select: { userId: true } } },
  })
  return NextResponse.json(serializeProject(project!))
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const exists = await prisma.project.findFirst({ where: { id, companyId: session.activeCompanyId } })
  if (!exists) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isOwner = exists.createdById === session.userId
  if (session.userRole !== 'admin' && !isOwner) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
