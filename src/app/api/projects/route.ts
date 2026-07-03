import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { companyId: session.activeCompanyId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { companyId: _drop, ...body } = await req.json()
  try {
    const project = await prisma.project.create({ data: { ...body, companyId: session.activeCompanyId } })
    return NextResponse.json(project, { status: 201 })
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un proyecto con ese nombre' }, { status: 409 })
    }
    throw e
  }
}
