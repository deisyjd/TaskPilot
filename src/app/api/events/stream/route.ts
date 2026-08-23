import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { subscribeEvents, type AppEvent } from '@/lib/events'

// Conexión de larga vida: nunca cachear ni prerenderizar, y correr en Node
// (ioredis / EventEmitter no funcionan en el runtime edge).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 3600

// Server-Sent Events: un stream por usuario. El navegador (EventSource) se
// reconecta solo si la conexión se cae.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return new Response('No autenticado', { status: 401 })

  const userId = session.userId
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const send = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // el stream ya está cerrado
        }
      }

      // retry: intervalo de reconexión del navegador. El comentario inicial
      // fuerza el envío de cabeceras y "abre" el stream en el cliente.
      send('retry: 5000\n\n')
      send(': connected\n\n')

      const unsubscribe = subscribeEvents((event: AppEvent) => {
        if (!event.userIds.includes(userId)) return
        send(`event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`)
      })

      // Heartbeat: mantiene viva la conexión frente a timeouts de proxies.
      const heartbeat = setInterval(() => send(': ping\n\n'), 25000)

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // ya cerrado
        }
      }

      req.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Desactiva el buffering de nginx para que los chunks lleguen al instante.
      'X-Accel-Buffering': 'no',
    },
  })
}
