'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Plug, Copy, Check } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function McpInstallModal({ open, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wiplitask.com'
  const endpoint = `${origin}/api/mcp`

  const claudeCmd = `claude mcp add --scope user --transport http wiplitask ${endpoint} --header "Authorization: Bearer TU_TOKEN"`

  const codexCfg = `[mcp_servers.wiplitask]
command = "node"
args = ["/ruta/al/repo/mcp-server/taskpilot-stdio.mjs"]
env = { TASKPILOT_URL = "${origin}", TASKPILOT_TOKEN = "TU_TOKEN" }`

  const cursorCfg = `{
  "mcpServers": {
    "wiplitask": {
      "url": "${endpoint}",
      "headers": { "Authorization": "Bearer TU_TOKEN" }
    }
  }
}`

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000)
  }

  const block = (key: string, title: string, subtitle: string, code: string) => (
    <div>
      <p className="text-xs font-semibold" style={{ color: 'var(--tp-text)' }}>{title}</p>
      <p className="text-[11px] mb-2" style={{ color: 'var(--tp-text-2)' }}>{subtitle}</p>
      <div className="relative">
        <pre
          className="text-[11px] p-3 pr-16 rounded-xl overflow-x-auto whitespace-pre-wrap break-all"
          style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)', fontFamily: 'monospace', border: '1px solid var(--tp-border)' }}
        >
{code}
        </pre>
        <button
          onClick={() => copy(key, code)}
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all hover:opacity-85"
          style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
        >
          {copied === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied === key ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: '560px', width: '94vw', borderRadius: '24px', border: '1px solid var(--tp-border)' }}
      >
        <div className="flex items-center gap-3 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--tp-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
            <Plug className="w-5 h-5" style={{ color: 'var(--tp-text-2)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>Conectar un asistente por MCP</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>Reemplaza <code style={{ fontFamily: 'monospace' }}>TU_TOKEN</code> por el token que creaste arriba.</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[68vh] overflow-y-auto">
          <div
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--tp-bg-2)' }}
          >
            <span className="text-[11px]" style={{ color: 'var(--tp-text-2)' }}>Endpoint MCP</span>
            <code className="text-[11px] truncate" style={{ fontFamily: 'monospace', color: 'var(--tp-text)' }}>{endpoint}</code>
          </div>

          {/* Opción OAuth (sin token manual) */}
          <div className="p-3 rounded-xl" style={{ border: '1px solid var(--tp-lime)', backgroundColor: 'rgba(223,255,95,0.12)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--tp-text)' }}>Claude Desktop / Claude.ai (con OAuth — sin token)</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--tp-text-2)' }}>
              Agrega un <strong>conector personalizado</strong> con la URL de abajo. Claude te pedirá iniciar sesión en
              Wipli y autorizar; no necesitas pegar ningún token. Actúa sobre tu empresa activa.
            </p>
            <code className="block text-[11px] mt-2 px-3 py-2 rounded-lg break-all" style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)', fontFamily: 'monospace' }}>
              {endpoint}
            </code>
          </div>

          <p className="text-[11px] font-semibold" style={{ color: 'var(--tp-text-2)' }}>O con token (PAT):</p>

          {block('claude', 'Claude Code (HTTP)', 'Ejecuta este comando en tu terminal.', claudeCmd)}
          {block('codex', 'Codex CLI (stdio)', 'Agrega esto a ~/.codex/config.toml (usa el puente del repo).', codexCfg)}
          {block('cursor', 'Cursor / VS Code (HTTP)', 'Agrega esto a tu mcp.json.', cursorCfg)}

          <p className="text-[11px]" style={{ color: 'var(--tp-text-2)' }}>
            Más clientes (Claude Desktop, Windsurf, Claude.ai) y detalles en <code style={{ fontFamily: 'monospace' }}>mcp-server/README.md</code> del repositorio.
          </p>
        </div>

        <div className="flex items-center justify-end px-6 py-4" style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70"
            style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
