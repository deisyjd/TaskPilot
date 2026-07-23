import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export function serializeProject<T extends { members: { userId: string; role: string }[] }>(project: T) {
  return {
    ...project,
    members: project.members.map((m) => m.userId),
    viewerUserIds: project.members.filter((m) => m.role === 'viewer').map((m) => m.userId),
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const isAdmin = session.userRole === 'admin'

  const projects = await prisma.project.findMany({
    where: {
      companyId: session.activeCompanyId,
      ...(isAdmin
        ? {}
        : { OR: [{ members: { none: {} } }, { members: { some: { userId: session.userId } } }] }),
    },
    include: {
      notes: { orderBy: { updatedAt: 'desc' } },
      members: { select: { userId: true, role: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(projects.map(serializeProject))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  // Solo 'viewer' no puede crear proyectos — admin y member sí.
  if (!session || session.userRole === 'viewer') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Whitelist: el cliente envía campos que no son columnas (createdBy, …)
  const { name, description, color, status, featured, coverImageUrl, memberIds, viewerMemberIds } = await req.json()
  if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        color,
        status,
        featured,
        coverImageUrl,
        companyId: session.activeCompanyId,
        createdById: session.userId,
        members:
          Array.isArray(memberIds) && memberIds.length > 0
            ? {
                createMany: {
                  data: memberIds.map((userId: string) => ({
                    userId,
                    role: Array.isArray(viewerMemberIds) && viewerMemberIds.includes(userId) ? 'viewer' : 'editor',
                  })),
                },
              }
            : undefined,
      },
      include: { notes: true, members: { select: { userId: true, role: true } } },
    })
    return NextResponse.json(serializeProject(project), { status: 201 })
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un proyecto con ese nombre' }, { status: 409 })
    }
    throw e
  }
}
