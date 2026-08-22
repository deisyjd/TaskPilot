import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

// Almacenamiento de archivos en disco (volumen persistente montado en
// /app/uploads en producción). Guardamos el binario en disco y en la base de
// datos solo la URL corta (/api/uploads/<archivo>) — así la BD deja de crecer
// con base64. Los archivos viejos ya guardados como data URL siguen
// funcionando sin cambios (el navegador los renderiza igual).
//
// La carpeta se puede sobreescribir con UPLOADS_DIR; por defecto es
// <cwd>/uploads, que en el contenedor es /app/uploads (WORKDIR = /app).
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads')
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
}

const ALLOWED_EXACT = new Set(Object.keys(EXT_BY_MIME))
const ALLOWED_PREFIXES = ['image/', 'text/']

// Mismo criterio (o más estricto) que los distintos uploaders del cliente.
export function isAllowedUpload(type: string): boolean {
  return ALLOWED_PREFIXES.some((p) => type.startsWith(p)) || ALLOWED_EXACT.has(type)
}

function safeExt(file: File): string {
  if (EXT_BY_MIME[file.type]) return EXT_BY_MIME[file.type]
  const fromName = path.extname(file.name).replace(/[^a-z0-9]/gi, '').toLowerCase()
  return fromName || 'bin'
}

export interface SavedUpload {
  url: string
  name: string
  size: number
  type: string
}

export async function saveUploadedFile(file: File): Promise<SavedUpload> {
  const dir = uploadsDir()
  await mkdir(dir, { recursive: true })

  const key = `${randomBytes(16).toString('hex')}.${safeExt(file)}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, key), buffer)

  return { url: `/api/uploads/${key}`, name: file.name, size: file.size, type: file.type }
}
