import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'

// Paso final compartido por el login con contraseña (POST /api/auth/login) y
// el login con Google (GET /api/auth/google/callback) — ambos terminan en
// exactamente la misma sesión y forma de respuesta.
export async function completeLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: user.id },
    include: { company: true },
    orderBy: { createdAt: 'asc' },
  })
  if (memberships.length === 0) return null

  const active = memberships.find((m) => m.companyId === user.lastActiveCompanyId) ?? memberships[0]

  await createSession({ userId: user.id, email: user.email, userRole: active.role, activeCompanyId: active.companyId })
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveCompanyId: active.companyId } })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      userRole: active.role,
      initials: user.initials,
      color: user.color,
      avatarUrl: user.avatarUrl,
      status: user.status,
    },
    activeCompanyId: active.companyId,
    companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name, slug: m.company.slug, color: m.company.color, role: m.role })),
  }
}
