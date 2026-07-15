interface ReminderLike {
  dueDate: string
  dueTime?: string | null
  done?: boolean
}

// Sin hora especifica, un recordatorio se considera vigente desde la
// medianoche de su fecha (mismo comportamiento que antes de tener hora).
export function reminderDueTimestamp(r: ReminderLike): Date {
  const [y, m, d] = r.dueDate.split('-').map(Number)
  if (r.dueTime) {
    const [hh, mm] = r.dueTime.split(':').map(Number)
    return new Date(y, m - 1, d, hh, mm)
  }
  return new Date(y, m - 1, d, 0, 0, 0)
}

export function isReminderDue(r: ReminderLike): boolean {
  if (r.done) return false
  return reminderDueTimestamp(r).getTime() <= Date.now()
}

export function formatReminderDateTime(r: ReminderLike): string {
  const due = reminderDueTimestamp(r)
  const datePart = due.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  if (!r.dueTime) return datePart
  const timePart = due.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit' })
  return `${datePart}, ${timePart}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export interface SnoozeOption {
  label: string
  compute: () => { dueDate: string; dueTime: string }
}

export function getSnoozeOptions(): SnoozeOption[] {
  function from(ms: number) {
    const d = new Date(Date.now() + ms)
    return {
      dueDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      dueTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    }
  }
  const HOUR = 3600_000
  const DAY = 24 * HOUR
  return [
    { label: 'En 1 hora', compute: () => from(HOUR) },
    { label: 'En 3 horas', compute: () => from(3 * HOUR) },
    { label: 'Mañana', compute: () => from(DAY) },
    { label: 'En 1 semana', compute: () => from(7 * DAY) },
  ]
}
