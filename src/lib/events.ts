import { EventEmitter } from 'node:events'
import type Redis from 'ioredis'
import { getRedis } from '@/lib/redis'

// Bus de eventos en tiempo real para SSE.
//
// - Con Redis configurado: los eventos se publican en un canal pub/sub, así que
//   funcionan aunque haya varias instancias detrás de un balanceador (una
//   instancia publica, todas reciben y reparten a sus conexiones SSE locales).
// - Sin Redis: se reparte en proceso con un EventEmitter (suficiente para una
//   única instancia / desarrollo). Todo degrada limpio: si Redis se cae, el
//   chat sigue funcionando por sondeo como antes.

const CHANNEL = 'taskpilot:events'

export type AppEvent = {
  kind: 'message'
  // Usuarios que deben recibir el evento (participantes de la conversación).
  userIds: string[]
  conversationId: string
  senderId: string
  // Mensaje ya serializado (mismo shape que /api/conversations/[id]/messages).
  message: {
    id: string
    conversationId: string
    senderId: string
    text: string
    attachments?: unknown
    links?: unknown
    createdAt: string | Date
    updatedAt: string | Date
  }
}

type Listener = (event: AppEvent) => void

const globalForEvents = globalThis as unknown as {
  tpEventBus?: EventEmitter
  tpEventSub?: Redis | null
}

function bus(): EventEmitter {
  if (!globalForEvents.tpEventBus) {
    const emitter = new EventEmitter()
    // Un listener por conexión SSE abierta: sin límite artificial.
    emitter.setMaxListeners(0)
    globalForEvents.tpEventBus = emitter
  }
  return globalForEvents.tpEventBus
}

// Suscriptor Redis único por instancia. Reenvía cada evento publicado (por esta
// u otra instancia) al bus local, que lo entrega a las conexiones SSE de aquí.
// Idempotente: se puede llamar en cada publish/subscribe sin coste.
function ensureSubscriber(): void {
  if (globalForEvents.tpEventSub !== undefined) return
  const base = getRedis()
  if (!base) {
    globalForEvents.tpEventSub = null
    return
  }
  const sub = base.duplicate()
  sub.on('error', (err) => console.error('[events] sub error:', err.message))
  sub.subscribe(CHANNEL).catch((err) => console.error('[events] subscribe error:', err.message))
  sub.on('message', (_channel, payload) => {
    try {
      bus().emit('event', JSON.parse(payload) as AppEvent)
    } catch {
      // payload corrupto: ignora
    }
  })
  globalForEvents.tpEventSub = sub
}

// Publica un evento. Con Redis va a todas las instancias (incluida esta, vía su
// propio suscriptor); sin Redis se reparte en proceso. Nunca lanza.
export function publishEvent(event: AppEvent): void {
  const redis = getRedis()
  if (redis) {
    ensureSubscriber()
    redis.publish(CHANNEL, JSON.stringify(event)).catch(() => {
      // fallo al publicar: el chat sigue por sondeo
    })
  } else {
    bus().emit('event', event)
  }
}

// Suscribe una conexión SSE al bus. Devuelve la función de limpieza.
export function subscribeEvents(listener: Listener): () => void {
  ensureSubscriber()
  const emitter = bus()
  emitter.on('event', listener)
  return () => emitter.off('event', listener)
}
