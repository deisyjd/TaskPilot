'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Copy, Check, Trash2, Plus, TriangleAlert } from 'lucide-react'

interface ApiToken {
  id: string
  name: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

function fmt(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ApiTokensPanel() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/tokens')
      if (res.ok) setTokens(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo crear el token')
        return
      }
      setNewToken(data.token)
      setTokens((prev) => [{ id: data.id, name: data.name, lastUsedAt: null, expiresAt: data.expiresAt, createdAt: data.createdAt }, ...prev])
      setName('')
      setShowForm(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
    if (res.ok) setTokens((prev) => prev.filter((t) => t.id !== id))
  }

  function copyToken() {
    if (!newToken) return
    navigator.clipboard.writeText(newToken).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mcpEndpoint = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp'
  const claudeCmd = newToken
    ? `claude mcp add --scope user --transport http wiplitask ${mcpEndpoint} --header "Authorization: Bearer ${newToken}"`
    : ''

  function copyClaudeCmd() {
    if (!claudeCmd) return
    navigator.clipboard.writeText(claudeCmd).catch(() => {})
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 2000)
  }

  return (
    <div
      className="p-6"
      style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', border: '1px solid var(--tp-border)' }}
    >
      <h2 className="font-semibold text-base mb-1 flex items-center gap-2" style={{ color: 'var(--tp-text)' }}>
        <KeyRound className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
        Acceso por API / MCP
      </h2>
      <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>
        Genera un token para conectar asistentes (Claude, Codex…) vía MCP y gestionar tus proyectos desde ahí. El token
        actúa con tu rol en la empresa activa. Guárdalo bien: se muestra una sola vez.
      </p>

      {/* Token recién creado — se muestra una única vez */}
      {newToken && (
        <div className="mb-5 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(223,255,95,0.12)', border: '1px solid var(--tp-lime)' }}>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--tp-text)' }}>
            <TriangleAlert className="w-3.5 h-3.5" />
            Copia este token ahora — no se volverá a mostrar
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs px-3 py-2 rounded-lg break-all"
              style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)', fontFamily: 'monospace' }}
            >
              {newToken}
            </code>
            <button
              onClick={copyToken}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all hover:opacity-85"
              style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* Comando listo para Claude Code */}
          <p className="text-xs font-semibold mt-3 mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
            Conectar en Claude Code:
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-[11px] px-3 py-2 rounded-lg break-all"
              style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)', fontFamily: 'monospace' }}
            >
              {claudeCmd}
            </code>
            <button
              onClick={copyClaudeCmd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all hover:opacity-85"
              style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCmd ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--tp-text-2)' }}>
            Para Codex, Cursor, VS Code y más, mira <code style={{ fontFamily: 'monospace' }}>mcp-server/README.md</code> en el repositorio.
          </p>
        </div>
      )}

      {/* Lista de tokens */}
      {loading ? (
        <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Cargando…</p>
      ) : tokens.length === 0 ? (
        <p className="text-xs mb-4" style={{ color: 'var(--tp-text-2)' }}>Aún no tienes tokens.</p>
      ) : (
        <ul className="flex flex-col gap-2 mb-4">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ backgroundColor: 'var(--tp-bg)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--tp-text)' }}>{t.name}</p>
                <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
                  Creado {fmt(t.createdAt)} · Último uso {fmt(t.lastUsedAt)}
                  {t.expiresAt ? ` · Expira ${fmt(t.expiresAt)}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Crear token */}
      {showForm ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre del token (ej. Claude de Julián)"
              autoFocus
              className="flex-1 text-sm"
              style={{ height: '40px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)', outline: 'none' }}
            />
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all hover:opacity-85 disabled:opacity-40"
              style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
            >
              {creating ? 'Creando…' : 'Crear'}
            </button>
            <button
              onClick={() => { setShowForm(false); setName(''); setError('') }}
              className="px-3 py-2 rounded-full text-sm font-medium shrink-0 transition-all hover:opacity-70"
              style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
            >
              Cancelar
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : (
        <button
          onClick={() => { setShowForm(true); setNewToken(null) }}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-85"
          style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}
        >
          <Plus className="w-4 h-4" />
          Crear token
        </button>
      )}
    </div>
  )
}
