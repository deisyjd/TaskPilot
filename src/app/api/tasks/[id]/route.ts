import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const task = await prisma.task.findUnique({
    where: { id },
    include: { checklist: true, comments: true },
  })

  if (!task) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(serializeTask(task))
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { checklist, comments, ...data } = body

  if (data.tags) data.tags = JSON.stringify(data.tags)

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { checklist: true, comments: true },
  })

  return NextResponse.json(serializeTask(task))
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

function serializeTask(task: Record<string, unknown> & { tags: unknown }) {
  return {
    ...task,
    tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags,
  }
}
