import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  for (const key of ['title', 'content', 'color']) {
    if (key in body) data[key] = body[key]
  }

  const result = await prisma.note.updateMany({ where: { id, companyId: session.activeCompanyId }, data })
  if (result.count === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const note = await prisma.note.findUnique({ where: { id } })
  return NextResponse.json(note)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const result = await prisma.note.deleteMany({ where: { id, companyId: session.activeCompanyId } })
  if (result.count === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
