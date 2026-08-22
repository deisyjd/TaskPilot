// Sube un archivo (o Blob ya comprimido) al volumen del servidor vía
// POST /api/uploads y devuelve la URL corta (/api/uploads/<archivo>) que se
// guarda en la base de datos en lugar del base64.
export async function uploadFile(file: Blob, filename?: string): Promise<string> {
  const name = filename ?? (file instanceof File ? file.name : 'upload')
  const fd = new FormData()
  fd.append('file', file, name)

  const res = await fetch('/api/uploads', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'No se pudo subir el archivo')
  }
  const data = (await res.json()) as { url: string }
  return data.url
}
