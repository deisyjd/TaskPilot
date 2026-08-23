import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { noteVisibilityFilter, serializeNote } from '@/lib/noteAccess'

export function serializeProject<
  T extends {
    members: { userId: string; role: string }[]
    notes?: { createdById: string | null; shares: { userId: string; role: string }[] }[]
    favorites?: { userId: string }[]
  }
>(project: T, currentUserId?: string) {
  const { favorites, ...rest } = project
  return {
    ...rest,
    members: project.members.map((m) => m.userId),
    viewerUserIds: project.members.filter((m) => m.role === 'viewer').map((m) => m.userId),
    notes: project.notes && currentUserId ? project.notes.map((n) => serializeNote(n, currentUserId)) : project.notes,
    featured: favorites ? favorites.some((f) => f.userId === currentUserId) : false,
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
      notes: {
        where: noteVisibilityFilter(session),
        orderBy: { updatedAt: 'desc' },
        include: { shares: { select: { userId: true, role: true } } },
      },
      members: { select: { userId: true, role: true } },
      favorites: { where: { userId: session.userId }, select: { userId: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(projects.map((p) => serializeProject(p, session.userId)))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  // Solo 'viewer' no puede crear proyectos — admin y member sí.
  if (!session || session.userRole === 'viewer') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Whitelist: el cliente envía campos que no son columnas (createdBy, …)
  const { name, description, color, status, featured, coverImageUrl, logoUrl, memberIds, viewerMemberIds } = await req.json()
  if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        color,
        status,
        coverImageUrl,
        logoUrl,
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
        favorites: featured ? { create: { userId: session.userId } } : undefined,
      },
      include: {
        notes: { include: { shares: { select: { userId: true, role: true } } } },
        members: { select: { userId: true, role: true } },
        favorites: { where: { userId: session.userId }, select: { userId: true } },
      },
    })
    return NextResponse.json(serializeProject(project, session.userId), { status: 201 })
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un proyecto con ese nombre' }, { status: 409 })
    }
    throw e
  }
}
