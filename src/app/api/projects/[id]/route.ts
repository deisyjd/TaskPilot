import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const { companyId: _drop, ...data } = await req.json()

  const result = await prisma.project.updateMany({ where: { id, companyId: session.activeCompanyId }, data })
  if (result.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const project = await prisma.project.findUnique({ where: { id } })
  return NextResponse.json(project)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const result = await prisma.project.deleteMany({ where: { id, companyId: session.activeCompanyId } })
  if (result.count === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
