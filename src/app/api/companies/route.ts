import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, createSession } from '@/lib/auth'

function slugify(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'empresa'
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.userRole !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { name, color } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  const base = slugify(name)
  let slug = base
  let suffix = 1
  while (await prisma.company.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }

  const company = await prisma.company.create({
    data: { name: name.trim(), slug, ...(color ? { color } : {}) },
  })

  await prisma.companyMembership.create({
    data: { userId: session.userId, companyId: company.id, role: 'admin' },
  })

  await createSession({
    userId: session.userId,
    email: session.email,
    userRole: 'admin',
    activeCompanyId: company.id,
  })
  await prisma.user.update({ where: { id: session.userId }, data: { lastActiveCompanyId: company.id } })

  return NextResponse.json(
    {
      company: { id: company.id, name: company.name, slug: company.slug, color: company.color, role: 'admin' },
      activeCompanyId: company.id,
      userRole: 'admin',
    },
    { status: 201 }
  )
}
