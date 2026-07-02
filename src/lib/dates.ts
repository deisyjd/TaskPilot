// Parse a date string as local time to avoid UTC offset shifting the day.
// "2024-06-30" treated as UTC would be Jun 29 at 7pm in UTC-5 (Colombia).
function parseLocal(dateStr: string): Date {
  if (!dateStr) return new Date(NaN)
  // If it already has time info (ISO with T), use as-is
  if (dateStr.includes('T')) return new Date(dateStr)
  // "YYYY-MM-DD" → split and build as local midnight
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isToday(dateStr: string): boolean {
  const today = new Date()
  const d = parseLocal(dateStr)
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

export function isOverdue(dateStr: string, status: string): boolean {
  if (status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parseLocal(dateStr) < today
}

export function isDueThisWeek(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(today.getDate() + 7)
  const d = parseLocal(dateStr)
  return d >= today && d <= end
}

export function formatDate(dateStr: string): string {
  return parseLocal(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRelative(dateStr: string): string {
  const now = new Date()
  const d = parseLocal(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  return formatDate(dateStr)
}

export function formatDateTime(dateStr: string): string {
  return parseLocal(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDayLabel(dateStr: string): string {
  return parseLocal(dateStr).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function getWeekDays(weekOffset = 0): Date[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
