import { prisma } from '@/lib/prisma'

// Un admin nunca es "solo ver" — para todos los demás, revisa si tienen una
// fila de ProjectMember con role='viewer' en este proyecto puntual.
export async function isProjectViewerServer(
  session: { userRole: string; userId: string },
  projectId: string
): Promise<boolean> {
  if (session.userRole === 'admin') return false
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.userId } },
    select: { role: true },
  })
  return membership?.role === 'viewer'
}
