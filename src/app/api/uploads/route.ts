import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAllowedUpload, saveUploadedFile } from '@/lib/uploads'

export const runtime = 'nodejs'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 413 })
  }
  if (!isAllowedUpload(file.type)) {
    return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type || 'desconocido'}` }, { status: 415 })
  }

  const saved = await saveUploadedFile(file)
  return NextResponse.json(saved, { status: 201 })
}
