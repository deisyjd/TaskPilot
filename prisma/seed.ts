import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Users
  const hashedPassword = await bcrypt.hash('wipli2024', 12)

  await prisma.user.upsert({
    where: { email: 'deisy@wipli.app' },
    update: {},
    create: {
      id: 'deisy',
      name: 'Deisy',
      email: 'deisy@wipli.app',
      password: hashedPassword,
      role: 'Directora',
      userRole: 'admin',
      initials: 'D',
      color: 'bg-violet-500',
      status: 'active',
    },
  })

  await prisma.user.upsert({
    where: { email: 'diego@wipli.app' },
    update: {},
    create: {
      id: 'diego',
      name: 'Diego',
      email: 'diego@wipli.app',
      password: hashedPassword,
      role: 'Diseñador',
      userRole: 'member',
      initials: 'Di',
      color: 'bg-blue-500',
      status: 'active',
    },
  })

  await prisma.user.upsert({
    where: { email: 'karol@wipli.app' },
    update: {},
    create: {
      id: 'karol',
      name: 'Karol',
      email: 'karol@wipli.app',
      password: hashedPassword,
      role: 'Redactora',
      userRole: 'member',
      initials: 'K',
      color: 'bg-pink-500',
      status: 'active',
    },
  })

  await prisma.user.upsert({
    where: { email: 'julian@wipli.app' },
    update: {},
    create: {
      id: 'julian',
      name: 'Julian',
      email: 'julian@wipli.app',
      password: hashedPassword,
      role: 'Desarrollador',
      userRole: 'member',
      initials: 'J',
      color: 'bg-emerald-500',
      status: 'active',
    },
  })

  console.log('✓ Users created')

  // Projects
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

  for (const p of projects) {
    await prisma.project.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    })
  }

  console.log('✓ Projects created')

  // Tasks
  const tasks = [
    {
      id: 'task-001',
      title: 'Diseñar banners para redes sociales',
      projectName: 'Qenta',
      description: 'Crear 3 formatos de banner (feed, stories, portada) para la campaña de lanzamiento.',
      status: 'in-progress',
      assignee: 'Diego',
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
      assignee: 'Karol',
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
      assignee: 'Julian',
      dueDate: '2026-07-25',
      priority: 'high',
      type: 'dev',
      tags: ['web', 'frontend'],
    },
  ]

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, tags: JSON.stringify(t.tags) },
    })
  }

  console.log('✓ Tasks created')
  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
