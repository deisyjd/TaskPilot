import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAppBaseUrl } from '@/lib/googleOAuth'
import { checkRateLimit } from '@/lib/rateLimit'
import { TOOLS, type McpContext } from '@/lib/mcp/tools'

// Servidor MCP (Model Context Protocol) sobre Streamable HTTP en modo stateless:
// recibe mensajes JSON-RPC 2.0 por POST y responde con application/json. Cada
// herramienta llama internamente a la API REST de TaskPilot reenviando el token
// del cliente, así se reutilizan permisos y validaciones existentes.
// Auth: Authorization: Bearer <token> — un PAT (tp_live_) o un access token
// OAuth (tp_oauth_). Sin token válido devuelve 401 con WWW-Authenticate para el
// descubrimiento OAuth (Claude Desktop/Web).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
}

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'TaskPilot', version: '1.0.0' }

// Protección contra abuso / saturación del pool bajo alta concurrencia.
const RATE_LIMIT = 300 // mensajes JSON-RPC por usuario…
const RATE_WINDOW = 60 // …cada 60 s
const MAX_BATCH = 50 // tamaño máximo de un lote JSON-RPC
const BATCH_CONCURRENCY = 5 // cuántos mensajes de un lote se procesan a la vez

// Ejecuta `fn` sobre `items` con un tope de concurrencia (evita que un lote
// grande abra decenas de self-fetches + transacciones en paralelo).
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const idx = next++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

function rpcResult(id: JsonRpcRequest['id'], result: unknown) {
  return { jsonrpc: '2.0', id, result }
}
function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

function makeContext(req: NextRequest): McpContext {
  const base = process.env.APP_URL?.replace(/\/+$/, '') ?? new URL(req.url).origin
  const authHeader = req.headers.get('authorization') ?? ''
  return {
    api: async (path, init) => {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          authorization: authHeader,
          ...(init?.headers as Record<string, string> | undefined),
        },
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`)
      return data
    },
  }
}

async function handleMessage(msg: JsonRpcRequest, ctx: McpContext): Promise<object | null> {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: (params?.protocolVersion as string) || PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      })
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null // notificaciones: sin respuesta
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      })
    case 'tools/call': {
      const name = params?.name as string
      const args = (params?.arguments as Record<string, unknown>) ?? {}
      const tool = TOOLS.find((t) => t.name === name)
      if (!tool) {
        return rpcResult(id, { content: [{ type: 'text', text: `Herramienta desconocida: ${name}` }], isError: true })
      }
      try {
        const data = await tool.handler(args, ctx)
        return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] })
      } catch (err) {
        const text = err instanceof Error ? err.message : 'Error ejecutando la herramienta'
        return rpcResult(id, { content: [{ type: 'text', text: `Error: ${text}` }], isError: true })
      }
    }
    default:
      // Notificaciones desconocidas (sin id) se ignoran; métodos con id → error.
      if (id === undefined || id === null) return null
      return rpcError(id, -32601, `Método no soportado: ${method}`)
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    const base = getAppBaseUrl(req)
    return NextResponse.json(rpcError(null, -32001, 'No autenticado.'), {
      status: 401,
      headers: {
        ...CORS,
        'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
      },
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(rpcError(null, -32700, 'JSON inválido'), { status: 400, headers: CORS })
  }

  // Tope de lote: un array JSON-RPC gigante podría abanicar cientos de
  // operaciones en paralelo contra la BD.
  if (Array.isArray(body) && body.length > MAX_BATCH) {
    return NextResponse.json(rpcError(null, -32600, `Lote demasiado grande (máx. ${MAX_BATCH} mensajes)`), {
      status: 400,
      headers: CORS,
    })
  }

  // Rate limit por usuario (cuenta cada mensaje del lote). Fail-open sin Redis.
  const messageCount = Array.isArray(body) ? Math.max(1, body.length) : 1
  const rl = await checkRateLimit(`mcp:${session.userId}`, RATE_LIMIT, RATE_WINDOW, messageCount)
  if (!rl.ok) {
    return NextResponse.json(rpcError(null, -32000, `Demasiadas peticiones. Reintenta en ${rl.resetSeconds}s.`), {
      status: 429,
      headers: { ...CORS, 'Retry-After': String(rl.resetSeconds) },
    })
  }

  const ctx = makeContext(req)

  if (Array.isArray(body)) {
    const responses = (
      await mapWithConcurrency(body as JsonRpcRequest[], BATCH_CONCURRENCY, (m) => handleMessage(m, ctx))
    ).filter(Boolean)
    if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS })
    return NextResponse.json(responses, { headers: CORS })
  }

  const response = await handleMessage(body as JsonRpcRequest, ctx)
  if (!response) return new NextResponse(null, { status: 202, headers: CORS })
  return NextResponse.json(response, { headers: CORS })
}

// En modo stateless no abrimos un stream de servidor (SSE).
export function GET() {
  return new NextResponse('Method Not Allowed', { status: 405, headers: { ...CORS, Allow: 'POST' } })
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
