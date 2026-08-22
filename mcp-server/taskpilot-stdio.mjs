#!/usr/bin/env node
// Puente MCP stdio → HTTP para clientes que solo soportan servidores por
// stdio (p. ej. Codex CLI). Reenvía cada mensaje JSON-RPC (una línea) al
// endpoint remoto /api/mcp de TaskPilot con el token, y escribe la respuesta.
// Así reutiliza toda la lógica de herramientas del endpoint HTTP.
//
// Uso (variables de entorno):
//   TASKPILOT_URL   = https://wipli.adminainoa.com   (base de la app)
//   TASKPILOT_TOKEN = tp_live_...                     (token de Settings → API/MCP)
//
//   node mcp-server/taskpilot-stdio.mjs

import { createInterface } from 'node:readline'

const BASE = (process.env.TASKPILOT_URL || '').replace(/\/+$/, '')
const TOKEN = process.env.TASKPILOT_TOKEN || ''

if (!BASE || !TOKEN) {
  process.stderr.write('taskpilot-mcp: faltan TASKPILOT_URL y/o TASKPILOT_TOKEN en el entorno.\n')
  process.exit(1)
}

const ENDPOINT = `${BASE}/api/mcp`

function write(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

async function forward(msg) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(msg),
    })
    if (res.status === 202) return // notificación: sin respuesta
    const text = (await res.text()).trim()
    if (text) process.stdout.write(text + '\n')
  } catch (err) {
    // Solo respondemos a peticiones (con id), no a notificaciones.
    if (msg && msg.id !== undefined && msg.id !== null) {
      write({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `Error de conexión con TaskPilot: ${err?.message ?? err}` } })
    }
  }
}

// Procesa las líneas en orden (cadena de promesas) para no entrelazar la salida.
let chain = Promise.resolve()
const rl = createInterface({ input: process.stdin })
rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let msg
  try {
    msg = JSON.parse(trimmed)
  } catch {
    return // línea no-JSON: ignorar
  }
  chain = chain.then(() => forward(msg))
})
