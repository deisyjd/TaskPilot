const READ_KEY = 'wipli-read-notifications'

// Se guarda por navegador, igual que el registro de alertas de recordatorios
// (src/lib/reminderAlerts.ts) — marcar como leída una notificación puntual
// (tarea+motivo+fecha, o recordatorio+fecha) no la vuelve a mostrar mientras
// siga igual. Si la tarea se reprograma o cambia de motivo, cuenta como una
// notificación nueva y vuelve a aparecer.

function getReadSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(window.localStorage.getItem(READ_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function setReadSet(set: Set<string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(READ_KEY, JSON.stringify([...set]))
}

export function loadReadNotifications(): Set<string> {
  return getReadSet()
}

export function markNotificationsRead(ids: string[]): Set<string> {
  const set = getReadSet()
  ids.forEach((id) => set.add(id))
  setReadSet(set)
  return set
}

// Limpia ids cuyo id de tarea/recordatorio (el segundo segmento) ya no
// existe, para que el registro no crezca para siempre.
export function pruneReadNotifications(existingTaskIds: string[], existingReminderIds: string[]): Set<string> {
  const set = getReadSet()
  const taskIds = new Set(existingTaskIds)
  const reminderIds = new Set(existingReminderIds)
  let changed = false
  for (const id of Array.from(set)) {
    const [kind, refId] = id.split(':')
    const stillExists = kind === 'task' ? taskIds.has(refId) : kind === 'reminder' ? reminderIds.has(refId) : false
    if (!stillExists) {
      set.delete(id)
      changed = true
    }
  }
  if (changed) setReadSet(set)
  return set
}
