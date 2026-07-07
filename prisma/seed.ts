import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Companies
  await prisma.company.upsert({
    where: { id: 'legacy-co' },
    update: {},
    create: { id: 'legacy-co', name: 'Wipli (Legacy)', slug: 'legacy', color: '#8B5CF6' },
  })

  await prisma.company.upsert({
    where: { id: 'acme-co' },
    update: {},
    create: { id: 'acme-co', name: 'Acme Studio', slug: 'acme', color: '#0ea5e9' },
  })

  console.log('✓ Companies created')

  // Users
  const hashedPassword = await bcrypt.hash('wipli2024', 12)

  const users = [
    { id: 'deisy', name: 'Deisy', email: 'deisy@wipli.app', role: 'Directora', userRole: 'admin', initials: 'D', color: 'bg-violet-500' },
    { id: 'diego', name: 'Diego', email: 'diego@wipli.app', role: 'Diseñador', userRole: 'member', initials: 'Di', color: 'bg-blue-500' },
    { id: 'karol', name: 'Karol', email: 'karol@wipli.app', role: 'Redactora', userRole: 'member', initials: 'K', color: 'bg-pink-500' },
    { id: 'julian', name: 'Julian', email: 'julian@wipli.app', role: 'Desarrollador', userRole: 'member', initials: 'J', color: 'bg-emerald-500' },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashedPassword, status: 'active', lastActiveCompanyId: 'legacy-co' },
    })
    await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: u.id, companyId: 'legacy-co' } },
      update: {},
      create: { userId: u.id, companyId: 'legacy-co', role: u.userRole },
    })
  }

  // Deisy also belongs to Acme (as a regular member), to demo the company switcher
  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: 'deisy', companyId: 'acme-co' } },
    update: {},
    create: { userId: 'deisy', companyId: 'acme-co', role: 'member' },
  })

  // A user that only exists in Acme, to prove Legacy data is never visible to it
  await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: {},
    create: {
      id: 'acme-admin',
      name: 'Acme Admin',
      email: 'admin@acme.test',
      password: hashedPassword,
      role: 'Administradora',
      userRole: 'admin',
      initials: 'A',
      color: 'bg-sky-500',
      status: 'active',
      lastActiveCompanyId: 'acme-co',
    },
  })
  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: 'acme-admin', companyId: 'acme-co' } },
    update: {},
    create: { userId: 'acme-admin', companyId: 'acme-co', role: 'admin' },
  })

  console.log('✓ Users and memberships created')

  // Projects (Legacy)
  const projects = [
    { id: 'qenta', name: 'Qenta', color: '#6366f1', featured: true },
    { id: 'wigilabs', name: 'Wigilabs', color: '#0ea5e9', featured: true },
    { id: 'ainoa', name: 'Ainoa', color: '#f43f5e', featured: true },
    { id: 'distrito-padel', name: 'Distrito Pádel', color: '#10b981', featured: true },
    { id: 'sportspace', name: 'SportSpace', color: '#f59e0b', featured: false },
    { id: 'nuts', name: 'Nuts', color: '#8b5cf6', featured: false },
    { id: 'viteri', name: 'Viteri & Co', color: '#ec4899', featured: false },
    { id: 'planeta-tenis', name: 'Planeta Tenis', color: '#14b8a6', featured: false },
    { id: 'otros', name: 'Otros', color: '#94a3b8', featured: false },
  ]

  const projectIdByName: Record<string, string> = {}
  for (const p of projects) {
    const project = await prisma.project.upsert({
      where: { companyId_name: { companyId: 'legacy-co', name: p.name } },
      update: {},
      create: { ...p, companyId: 'legacy-co' },
    })
    projectIdByName[p.name] = project.id
  }

  // A same-named project in Acme — proves company-scoped uniqueness works
  const acmeQenta = await prisma.project.upsert({
    where: { companyId_name: { companyId: 'acme-co', name: 'Qenta' } },
    update: {},
    create: { id: 'acme-qenta', name: 'Qenta', color: '#0ea5e9', featured: true, companyId: 'acme-co' },
  })

  console.log('✓ Projects created')

  // Tasks (Legacy)
  const tasks = [
    {
      id: 'task-001',
      title: 'Diseñar banners para redes sociales',
      projectName: 'Qenta',
      description: 'Crear 3 formatos de banner (feed, stories, portada) para la campaña de lanzamiento.',
      status: 'in-progress',
      assigneeId: 'diego',
      dueDate: '2026-07-15',
      priority: 'high',
      type: 'design',
      tags: ['redes sociales', 'branding'],
    },
    {
      id: 'task-002',
      title: 'Redactar copy para email de bienvenida',
      projectName: 'Wigilabs',
      description: 'Escribir el correo de bienvenida para nuevos usuarios del app.',
      status: 'pending',
      assigneeId: 'karol',
      dueDate: '2026-07-20',
      priority: 'medium',
      type: 'copy',
      tags: ['email', 'onboarding'],
    },
    {
      id: 'task-003',
      title: 'Desarrollar landing page',
      projectName: 'Ainoa',
      description: 'Implementar landing page con Next.js y animaciones Framer Motion.',
      status: 'pending',
      assigneeId: 'julian',
      dueDate: '2026-07-25',
      priority: 'high',
      type: 'dev',
      tags: ['web', 'frontend'],
    },
  ]

  for (const t of tasks) {
    const { projectName, assigneeId, ...rest } = t
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        ...rest,
        tags: JSON.stringify(t.tags),
        companyId: 'legacy-co',
        projectId: projectIdByName[projectName],
        assignees: { create: [{ userId: assigneeId }] },
      },
    })
  }

  // One task in Acme, owned by the Acme-only user
  await prisma.task.upsert({
    where: { id: 'acme-task-001' },
    update: {},
    create: {
      id: 'acme-task-001',
      title: 'Preparar propuesta de marca',
      description: 'Brief inicial de identidad visual para Acme.',
      status: 'pending',
      dueDate: '2026-07-18',
      priority: 'medium',
      type: 'design',
      tags: JSON.stringify(['branding']),
      companyId: 'acme-co',
      projectId: acmeQenta.id,
      assignees: { create: [{ userId: 'acme-admin' }] },
    },
  })

  console.log('✓ Tasks created')
  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
