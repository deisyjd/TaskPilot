/* eslint-disable @typescript-eslint/no-require-imports */
// Plain CommonJS on purpose: runs via `node` in the production container
// entrypoint, with no build/transpile step (unlike prisma/seed.ts).
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const USERS = [
  { id: 'deisy', name: 'Deisy', email: 'deisy@wipli.app', role: 'Directora', userRole: 'admin', initials: 'D', color: 'bg-violet-500' },
  { id: 'diego', name: 'Diego', email: 'diego@wipli.app', role: 'Diseñador', userRole: 'member', initials: 'Di', color: 'bg-blue-500' },
  { id: 'karol', name: 'Karol', email: 'karol@wipli.app', role: 'Redactora', userRole: 'member', initials: 'K', color: 'bg-pink-500' },
  { id: 'julian', name: 'Julian', email: 'julian@wipli.app', role: 'Desarrollador', userRole: 'member', initials: 'J', color: 'bg-emerald-500' },
]

async function main() {
  const password = process.env.SEED_USER_PASSWORD
  if (!password) {
    console.log('SEED_USER_PASSWORD no está definida — se omite el seed inicial de usuarios.')
    return
  }

  const existing = await prisma.user.count()
  if (existing > 0) {
    console.log('Ya existen usuarios en la base de datos — se omite el seed inicial.')
    return
  }

  console.log('Creando empresa y usuarios iniciales...')

  const company = await prisma.company.upsert({
    where: { slug: 'wipli' },
    update: {},
    create: { name: 'Wipli', slug: 'wipli', color: '#8B5CF6' },
  })

  const hashedPassword = await bcrypt.hash(password, 12)

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashedPassword, status: 'active', lastActiveCompanyId: company.id },
    })
    await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: u.id, companyId: company.id } },
      update: {},
      create: { userId: u.id, companyId: company.id, role: u.userRole },
    })
  }

  console.log(`Listo: empresa "${company.name}" con ${USERS.length} usuarios. Cambien su contraseña desde el panel tras el primer ingreso.`)
}

main()
  .catch((err) => console.error('El seed inicial falló (la app continuará iniciando):', err))
  .finally(() => prisma.$disconnect())
