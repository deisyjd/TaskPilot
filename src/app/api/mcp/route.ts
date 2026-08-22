import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { TOOLS, type McpContext } from '@/lib/mcp/tools'

// Servidor MCP (Model Context Protocol) sobre Streamable HTTP en modo stateless:
// recibe mensajes JSON-RPC 2.0 por POST y responde con application/json. Cada
// herramienta llama internamente a la API REST de TaskPilot reenviando el token
// del cliente, así se reutilizan permisos y validaciones existentes.
// Auth: Authorization: Bearer tp_live_... (token creado en Settings → API/MCP).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'TaskPilot', version: '1.0.0' }

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
    return NextResponse.json(rpcError(null, -32001, 'No autenticado. Envía Authorization: Bearer tp_live_...'), {
      status: 401,
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(rpcError(null, -32700, 'JSON inválido'), { status: 400 })
  }

  const ctx = makeContext(req)

  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((m) => handleMessage(m as JsonRpcRequest, ctx)))).filter(Boolean)
    if (responses.length === 0) return new NextResponse(null, { status: 202 })
    return NextResponse.json(responses)
  }

  const response = await handleMessage(body as JsonRpcRequest, ctx)
  if (!response) return new NextResponse(null, { status: 202 })
  return NextResponse.json(response)
}

// En modo stateless no abrimos un stream de servidor (SSE).
export function GET() {
  return new NextResponse('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
}
