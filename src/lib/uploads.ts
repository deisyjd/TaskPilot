import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import { lookup } from 'dns/promises'
import { isIP } from 'net'

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

const MAX_REMOTE_BYTES = 10 * 1024 * 1024 // 10 MB, igual que /api/uploads

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '0.0.0.0') return true
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true // ULA/link-local IPv6
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false
  const [a, b] = parts
  return (
    a === 127 || // loopback
    a === 10 || // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) || // 192.168.0.0/16
    (a === 169 && b === 254) // link-local
  )
}

// Descarga una imagen/archivo desde una URL pública y lo guarda igual que un
// upload normal — usado por la herramienta MCP `attach_image`, que recibe una
// URL en vez de un archivo binario. Bloquea localhost/IPs privadas (SSRF).
export async function saveFileFromUrl(sourceUrl: string, nameOverride?: string): Promise<SavedUpload> {
  let parsed: URL
  try {
    parsed = new URL(sourceUrl)
  } catch {
    throw new Error('URL inválida.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Solo se permiten URLs http/https.')
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || (isIP(hostname) && isPrivateIp(hostname))) {
    throw new Error('No se permite descargar desde direcciones internas.')
  }
  if (!isIP(hostname)) {
    const resolved = await lookup(hostname).catch(() => null)
    if (resolved && isPrivateIp(resolved.address)) {
      throw new Error('No se permite descargar desde direcciones internas.')
    }
  }

  // redirect: 'manual' evita que un 3xx salte a un host interno sin pasar por
  // la validación de arriba (bypass clásico de SSRF vía redirección).
  const res = await fetch(parsed, { redirect: 'manual' })
  if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
    throw new Error('La URL redirige a otra dirección; usa la URL final directa.')
  }
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${res.status}).`)

  const contentType = res.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream'
  if (!isAllowedUpload(contentType)) {
    throw new Error(`Tipo de archivo no permitido: ${contentType}`)
  }
  const contentLength = Number(res.headers.get('content-length') ?? 0)
  if (contentLength > MAX_REMOTE_BYTES) {
    throw new Error('El archivo supera el límite de 10 MB.')
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > MAX_REMOTE_BYTES) {
    throw new Error('El archivo supera el límite de 10 MB.')
  }

  const dir = uploadsDir()
  await mkdir(dir, { recursive: true })
  const ext = EXT_BY_MIME[contentType] || path.extname(parsed.pathname).replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
  const key = `${randomBytes(16).toString('hex')}.${ext}`
  await writeFile(path.join(dir, key), buffer)

  const name = nameOverride?.trim() || decodeURIComponent(path.basename(parsed.pathname)) || 'archivo'
  return { url: `/api/uploads/${key}`, name, size: buffer.byteLength, type: contentType }
}
