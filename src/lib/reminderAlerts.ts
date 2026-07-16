import { Reminder } from '@/types'
import { formatReminderDateTime } from '@/lib/reminders'

const STORAGE_KEY = 'wipli-reminder-alerts'

export function isReminderAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === 'on'
}

export function setReminderAlertsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
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
