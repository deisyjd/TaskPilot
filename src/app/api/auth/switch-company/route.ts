import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { companyId } = await req.json()
  if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })

  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: session.userId, companyId } },
    include: { company: true },
  })
  if (!membership) return NextResponse.json({ error: 'No perteneces a esa empresa' }, { status: 403 })

  await createSession({ userId: session.userId, email: session.email, userRole: membership.role, activeCompanyId: companyId })
  await prisma.user.update({ where: { id: session.userId }, data: { lastActiveCompanyId: companyId } })

  return NextResponse.json({
    activeCompanyId: companyId,
    userRole: membership.role,
    company: { id: membership.company.id, name: membership.company.name, slug: membership.company.slug, color: membership.company.color },
  })
}
