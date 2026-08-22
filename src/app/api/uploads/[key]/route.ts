import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { uploadsDir } from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ key: string }> }

const CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
  zip: 'application/zip',
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { key } = await params

  // Anti path-traversal: el nombre lo generamos nosotros (32 hex + extensión),
  // así que exigimos exactamente ese formato — nada de "/" ni "..".
  if (!/^[a-f0-9]{32}\.[a-z0-9]+$/i.test(key)) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  try {
    const buffer = await readFile(path.join(uploadsDir(), key))
    const ext = key.split('.').pop()!.toLowerCase()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': CONTENT_TYPE[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
}
