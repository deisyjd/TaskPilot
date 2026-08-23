import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { saveFileFromUrl } from '@/lib/uploads'

export const runtime = 'nodejs'

// Descarga un archivo desde una URL pública y lo guarda como un upload
// normal — pensado para el MCP, que no puede enviar multipart/form-data
// y en su lugar pasa la URL de la imagen/archivo a adjuntar.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  if (!url) return NextResponse.json({ error: 'url requerida' }, { status: 400 })

  try {
    const saved = await saveFileFromUrl(url, name)
    return NextResponse.json(saved, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo descargar el archivo'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
