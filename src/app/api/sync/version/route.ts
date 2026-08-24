import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Versión ligera del estado de datos de la empresa activa (proyectos + tareas +
// notas). El string cambia cuando se crea/edita/borra cualquiera de esos
// recursos, venga de donde venga (web, móvil, MCP): el conteo detecta altas y
// bajas, y el máximo updatedAt detecta ediciones. El cliente la compara con la
// que tenía cargada para saber si hay cambios sin sincronizar.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const companyId = session.activeCompanyId
  const [proj, task, note] = await Promise.all([
    prisma.project.aggregate({ where: { companyId }, _count: true, _max: { updatedAt: true } }),
    prisma.task.aggregate({ where: { companyId }, _count: true, _max: { updatedAt: true } }),
    prisma.note.aggregate({ where: { companyId }, _count: true, _max: { updatedAt: true } }),
  ])

  const v = [
    proj._count, proj._max.updatedAt?.getTime() ?? 0,
    task._count, task._max.updatedAt?.getTime() ?? 0,
    note._count, note._max.updatedAt?.getTime() ?? 0,
  ].join(':')

  return NextResponse.json({ v })
}
