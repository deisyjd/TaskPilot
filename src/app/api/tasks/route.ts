import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const tasks = await prisma.task.findMany({
    include: { checklist: true, comments: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tasks.map(serializeTask))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { checklist, comments, ...data } = body

  const task = await prisma.task.create({
    data: {
      ...data,
      tags: JSON.stringify(data.tags ?? []),
      checklist: checklist?.length
        ? { create: checklist.map(({ id: _id, ...c }: { id?: string; text: string; done: boolean }) => c) }
        : undefined,
    },
    include: { checklist: true, comments: true },
  })

  return NextResponse.json(serializeTask(task), { status: 201 })
}

function serializeTask(task: Record<string, unknown> & { tags: unknown }) {
  return {
    ...task,
    tags: typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags,
  }
}
