import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth'

// Cola compartida entre el login normal (sin 2FA) y la verificación del
// segundo factor (POST /api/auth/verify-2fa) — ambos terminan en exactamente
// la misma sesión y forma de respuesta.
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
      twoFactorEnabled: user.twoFactorEnabled,
    },
    activeCompanyId: active.companyId,
    companies: memberships.map((m) => ({ id: m.company.id, name: m.company.name, slug: m.company.slug, color: m.company.color, role: m.role })),
  }
}
