import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 's', 'mark', 'a', 'h1', 'h2', 'h3', 'ul', 'ol', 'li']
const ALLOWED_ATTR = ['href', 'target', 'rel']

// Único punto de confianza: el HTML que entra aquí puede venir de cualquier
// cliente (no solo del editor de la app), así que se sanitiza sin asumir que
// ya pasó por Tiptap — las notas se comparten con otras personas reales.
export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS, ALLOWED_ATTR })
}

const HTML_TAG_PATTERN = /<\/?(p|br|strong|em|b|i|s|mark|a|h[1-3]|ul|ol|li|div)\b/i

export function looksLikeHtml(content: string): boolean {
  return HTML_TAG_PATTERN.test(content)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Convierte notas antiguas guardadas como texto plano a HTML equivalente, para
// que el editor visual las pueda abrir sin perder los saltos de línea.
export function plainTextToHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('')
}

export function toEditableHtml(content: string): string {
  const text = content ?? ''
  if (!text.trim()) return ''
  return looksLikeHtml(text) ? text : plainTextToHtml(text)
}

export function htmlToPlainPreview(html: string, maxLen = 80): string {
  const text = (html ?? '')
    .replace(/<\/(p|h1|h2|h3|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '')
}
