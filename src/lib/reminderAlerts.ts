import { Reminder } from '@/types'
import { formatReminderDateTime } from '@/lib/reminders'

const STORAGE_KEY = 'wipli-reminder-alerts'
const ALERTED_KEY = 'wipli-alerted-reminders'

export function isReminderAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === 'on'
}

export function setReminderAlertsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
}

// Recuerda, por navegador, qué recordatorios ya avisaron y para qué fecha —
// así un recordatorio vencido sigue avisando la primera vez que la app lo ve
// (aunque eso pase al abrir la pestaña, no solo mientras ya estaba abierta),
// pero no se repite en cada recarga. Si se pospone a una fecha nueva, el
// timestamp cambia y vuelve a poder avisar.
function getAlertedMap(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(ALERTED_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function setAlertedMap(map: Record<string, number>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ALERTED_KEY, JSON.stringify(map))
}

export function hasAlertedReminder(reminderId: string, dueTimestamp: number): boolean {
  return getAlertedMap()[reminderId] === dueTimestamp
}

export function markReminderAlerted(reminderId: string, dueTimestamp: number) {
  const map = getAlertedMap()
  map[reminderId] = dueTimestamp
  setAlertedMap(map)
}

// Limpia entradas de recordatorios que ya no existen (borrados) para que el
// mapa en localStorage no crezca indefinidamente.
export function pruneAlertedReminders(existingIds: string[]) {
  const map = getAlertedMap()
  const idSet = new Set(existingIds)
  let changed = false
  for (const id of Object.keys(map)) {
    if (!idSet.has(id)) {
      delete map[id]
      changed = true
    }
  }
  if (changed) setAlertedMap(map)
}

let audioCtx: AudioContext | null = null

// Sintetiza un "ding" de dos tonos via Web Audio API — sin depender de un
// archivo de audio externo, funciona en cuanto el usuario haya interactuado
// una vez con la pagina (requisito de los navegadores para reproducir sonido).
export function playReminderChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    if (!audioCtx) audioCtx = new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const ctx = audioCtx
    const now = ctx.currentTime
    const notes = [880, 1318.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.15
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.45)
    })
  } catch {
    // Web Audio no disponible o bloqueado por el navegador — no bloquea la app.
  }
}

export function notifyReminderDue(reminder: Reminder) {
  playReminderChime()
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(`Recordatorio: ${reminder.title}`, {
        body: `${reminder.projectName} · ${formatReminderDateTime(reminder)}`,
        icon: '/wipli-icon.png',
        tag: reminder.id,
      })
    } catch {
      // Algunos navegadores restringen Notification fuera de un service worker.
    }
  }
}
