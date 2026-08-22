'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useTaskStore } from '@/store/useTaskStore'
import { FileBarChart, Mail, FileText, FileSpreadsheet, Check } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  scope: 'company' | 'project'
  companyName: string
  projectId?: string
  projectName?: string
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function presetRange(kind: 'today' | 'week' | 'month'): { start: string; end: string } {
  const now = new Date()
  const end = iso(now)
  if (kind === 'today') return { start: end, end }
  if (kind === 'week') {
    const s = new Date(now)
    s.setDate(now.getDate() - 6)
    return { start: iso(s), end }
  }
  return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end }
}

export function ReportModal({ open, onClose, scope, companyName, projectId, projectName }: Props) {
  const allProjects = useTaskStore((s) => s.projects)

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [emails, setEmails] = useState('')
  const [formats, setFormats] = useState({ mailing: true, pdf: true, excel: true })
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const r = presetRange('month')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStart(r.start)
      setEnd(r.end)
      setSelectedProjects([])
      setResult(null)
      setError(null)
    }
  }, [open])

  const toggleProject = (id: string) =>
    setSelectedProjects((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  const setPreset = (kind: 'today' | 'week' | 'month') => {
    const r = presetRange(kind)
    setStart(r.start)
    setEnd(r.end)
  }

  const toggleFmt = (k: 'mailing' | 'pdf' | 'excel') => setFormats((f) => ({ ...f, [k]: !f[k] }))

  async function handleSend() {
    setError(null)
    setResult(null)
    const selected = Object.entries(formats).filter(([, v]) => v).map(([k]) => k)
    if (selected.length === 0) { setError('Selecciona al menos un formato.'); return }
    if (!emails.trim()) { setError('Ingresa al menos un correo.'); return }

    setSending(true)
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          projectId,
          projectIds: scope === 'company' ? selectedProjects : undefined,
          start,
          end,
          emails,
          formats: selected,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'No se pudo enviar el reporte.'); return }
      setResult(`Reporte enviado a ${data.sentTo?.join(', ') ?? 'los correos'} (${data.tasks} tarea${data.tasks !== 1 ? 's' : ''}).`)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const dateInput: React.CSSProperties = {
    height: '40px', padding: '0 12px', borderRadius: '10px',
    border: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)', outline: 'none', fontSize: '14px',
  }

  const fmtOption = (k: 'mailing' | 'pdf' | 'excel', label: string, Icon: typeof Mail) => (
    <button
      type="button"
      onClick={() => toggleFmt(k)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
      style={{
        border: `1px solid ${formats[k] ? 'var(--tp-dark)' : 'var(--tp-border)'}`,
        backgroundColor: formats[k] ? 'var(--tp-dark)' : 'var(--tp-bg)',
        color: formats[k] ? 'var(--tp-lime)' : 'var(--tp-text-2)',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {formats[k] && <Check className="w-3.5 h-3.5" />}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: '480px', width: '92vw', borderRadius: '24px', border: '1px solid var(--tp-border)' }}
      >
        <div className="flex items-center gap-3 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--tp-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
            <FileBarChart className="w-5 h-5" style={{ color: 'var(--tp-text-2)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>Reporte de avance</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              {scope === 'project' ? `Proyecto: ${projectName}` : `Empresa: ${companyName}`}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Proyectos (solo alcance empresa) */}
          {scope === 'company' && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tp-text-2)' }}>
                Proyectos <span style={{ fontWeight: 400 }}>· déjalo vacío para incluir todos</span>
              </p>
              <div
                className="flex flex-col gap-1 max-h-40 overflow-y-auto p-2 rounded-xl"
                style={{ border: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-bg)' }}
              >
                {allProjects.length === 0 && (
                  <p className="text-xs px-1 py-2" style={{ color: 'var(--tp-text-2)' }}>No hay proyectos.</p>
                )}
                {allProjects.map((p) => {
                  const checked = selectedProjects.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                      style={{ backgroundColor: checked ? 'var(--tp-bg-2)' : 'transparent' }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleProject(p.id)} style={{ accentColor: 'var(--tp-dark)' }} />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-xs truncate" style={{ color: 'var(--tp-text)' }}>{p.name}</span>
                    </label>
                  )
                })}
              </div>
              {selectedProjects.length > 0 && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--tp-text-2)' }}>
                  {selectedProjects.length} proyecto{selectedProjects.length !== 1 ? 's' : ''} seleccionado{selectedProjects.length !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}

          {/* Rango */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tp-text-2)' }}>Rango de fechas</p>
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              {([['today', 'Hoy'], ['week', 'Últimos 7 días'], ['month', 'Este mes']] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setPreset(k)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full transition-all"
                  style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text-2)', border: '1px solid var(--tp-border)' }}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} style={{ ...dateInput, flex: 1 }} />
              <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>a</span>
              <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} style={{ ...dateInput, flex: 1 }} />
            </div>
          </div>

          {/* Correos */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tp-text-2)' }}>Enviar a (uno o varios correos, separados por coma)</p>
            <input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="correo@ejemplo.com, otro@ejemplo.com"
              style={{ ...dateInput, width: '100%' }}
            />
          </div>

          {/* Formatos */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tp-text-2)' }}>Formatos</p>
            <div className="flex items-center gap-2 flex-wrap">
              {fmtOption('mailing', 'Correo (mailing)', Mail)}
              {fmtOption('pdf', 'PDF', FileText)}
              {fmtOption('excel', 'Excel', FileSpreadsheet)}
            </div>
          </div>

          {result && <p className="text-xs font-medium" style={{ color: '#16a34a' }}>{result}</p>}
          {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4" style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70"
            style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
          >
            Cerrar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-50"
            style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
          >
            {sending ? 'Enviando…' : 'Generar y enviar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
