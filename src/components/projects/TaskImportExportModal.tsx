'use client'

import { useRef, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useTaskStore } from '@/store/useTaskStore'
import { Task, User, TaskStatus, Priority, STATUS_LABELS, PRIORITY_LABELS } from '@/types'
import { parseCsv, toCsv, downloadCsv } from '@/lib/csv'
import { htmlToPlainPreview } from '@/lib/richText'
import { Download, Upload, FileSpreadsheet } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  tasks: Task[]
  users: User[]
}

type ExportFilter = 'all' | 'pending' | 'done'

const HEADER = ['Titulo', 'Descripcion', 'Estado', 'Prioridad', 'Fecha limite', 'Responsables']

// Etiqueta legible → clave interna (para importar), aceptando también la clave.
const STATUS_BY_LABEL = new Map<string, TaskStatus>(
  (Object.entries(STATUS_LABELS) as [TaskStatus, string][]).flatMap(([k, v]) => [
    [v.toLowerCase(), k],
    [k.toLowerCase(), k],
  ])
)
const PRIORITY_BY_LABEL = new Map<string, Priority>(
  (Object.entries(PRIORITY_LABELS) as [Priority, string][]).flatMap(([k, v]) => [
    [v.toLowerCase(), k],
    [k.toLowerCase(), k],
  ])
)

function mapStatus(raw: string): TaskStatus {
  return STATUS_BY_LABEL.get(raw.trim().toLowerCase()) ?? 'pending'
}
function mapPriority(raw: string): Priority {
  return PRIORITY_BY_LABEL.get(raw.trim().toLowerCase()) ?? 'medium'
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TaskImportExportModal({ open, onClose, projectId, projectName, tasks, users }: Props) {
  const addTask = useTaskStore((s) => s.addTask)
  const fileRef = useRef<HTMLInputElement>(null)

  const [exportFilter, setExportFilter] = useState<ExportFilter>('all')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nameToId = new Map<string, string>(users.map((u) => [u.name.trim().toLowerCase(), u.id]))
  const emailToId = new Map<string, string>(
    users.filter((u) => u.email).map((u) => [(u.email ?? '').trim().toLowerCase(), u.id])
  )

  function resolveAssignees(raw: string): string[] {
    if (!raw?.trim()) return []
    return raw
      .split(/[;,]/)
      .map((s) => s.trim().toLowerCase())
      .map((s) => nameToId.get(s) ?? emailToId.get(s))
      .filter((id): id is string => Boolean(id))
  }

  function assigneeNames(ids: string[]): string {
    return ids.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean).join('; ')
  }

  function handleDownloadTemplate() {
    const example = ['Diseñar portada', 'Portada del post de lanzamiento', 'Pendiente', 'Alta', today(), 'Ana García; Julián']
    downloadCsv('plantilla-tareas.csv', toCsv([HEADER, example]))
  }

  function handleExport() {
    const filtered = tasks.filter((t) =>
      exportFilter === 'all' ? true : exportFilter === 'done' ? t.status === 'done' : t.status !== 'done'
    )
    const rows = [
      HEADER,
      ...filtered.map((t) => [
        t.title,
        htmlToPlainPreview(t.description ?? '', 5000),
        STATUS_LABELS[t.status] ?? t.status,
        PRIORITY_LABELS[t.priority] ?? t.priority,
        t.dueDate ?? '',
        assigneeNames(t.assigneeIds ?? []),
      ]),
    ]
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto'
    downloadCsv(`tareas-${slug}.csv`, toCsv(rows))
  }

  async function handleImport(file: File) {
    setImporting(true)
    setResult(null)
    setError(null)
    try {
      const rows = parseCsv(await file.text())
      if (rows.length < 2) {
        setError('El archivo no tiene filas de datos (solo cabecera o vacío).')
        return
      }
      const header = rows[0].map((h) => h.trim().toLowerCase())
      const col = (names: string[]) => header.findIndex((h) => names.includes(h))
      const iTitle = col(['titulo', 'título', 'title'])
      const iDesc = col(['descripcion', 'descripción', 'description'])
      const iStatus = col(['estado', 'status'])
      const iPrio = col(['prioridad', 'priority'])
      const iDue = col(['fecha limite', 'fecha límite', 'fecha_limite', 'vence', 'due', 'duedate'])
      const iAssignees = col(['responsables', 'asignados', 'assignees'])

      let created = 0
      let skipped = 0
      for (const r of rows.slice(1)) {
        const title = (iTitle >= 0 ? r[iTitle] : r[0] ?? '').trim()
        if (!title) { skipped++; continue }
        const res = await addTask({
          projectId,
          title,
          description: (iDesc >= 0 ? r[iDesc] : '')?.trim() ?? '',
          status: mapStatus(iStatus >= 0 ? r[iStatus] ?? '' : ''),
          priority: mapPriority(iPrio >= 0 ? r[iPrio] ?? '' : ''),
          dueDate: (iDue >= 0 ? r[iDue] : '')?.trim() || today(),
          assigneeIds: iAssignees >= 0 ? resolveAssignees(r[iAssignees] ?? '') : [],
        })
        if (res) created++
        else skipped++
      }
      setResult(`${created} tarea${created !== 1 ? 's' : ''} importada${created !== 1 ? 's' : ''}${skipped ? ` · ${skipped} omitida${skipped !== 1 ? 's' : ''}` : ''}.`)
    } catch {
      setError('No se pudo leer el archivo. Verifica que sea un CSV válido.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filterBtn = (key: ExportFilter, label: string) => (
    <button
      onClick={() => setExportFilter(key)}
      className="px-3 py-1.5 text-xs font-medium rounded-full transition-all"
      style={{
        backgroundColor: exportFilter === key ? 'var(--tp-dark)' : 'var(--tp-bg)',
        color: exportFilter === key ? '#fff' : 'var(--tp-text-2)',
        border: '1px solid var(--tp-border)',
      }}
    >
      {label}
    </button>
  )

  const pendingCount = tasks.filter((t) => t.status !== 'done').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: '480px', width: '92vw', borderRadius: '24px', border: '1px solid var(--tp-border)' }}
      >
        <div className="flex items-center gap-3 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--tp-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
            <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--tp-text-2)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>Importar / Exportar tareas</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>{projectName}</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Plantilla */}
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--tp-text)' }}>1. Plantilla</p>
            <p className="text-xs mb-2.5" style={{ color: 'var(--tp-text-2)' }}>
              Descarga un CSV de ejemplo con las columnas correctas para llenar y luego importar.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-all hover:opacity-85"
              style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)', border: '1px solid var(--tp-border)' }}
            >
              <Download className="w-3.5 h-3.5" />
              Descargar plantilla
            </button>
          </div>

          {/* Exportar */}
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--tp-text)' }}>2. Exportar tareas</p>
            <p className="text-xs mb-2.5" style={{ color: 'var(--tp-text-2)' }}>
              Descarga el listado actual de tareas del proyecto.
            </p>
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              {filterBtn('all', `Todas (${tasks.length})`)}
              {filterBtn('pending', `Pendientes (${pendingCount})`)}
              {filterBtn('done', `Completadas (${doneCount})`)}
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-all hover:opacity-85"
              style={{ backgroundColor: 'var(--tp-dark)', color: '#fff' }}
            >
              <Download className="w-3.5 h-3.5" />
              Descargar tareas
            </button>
          </div>

          {/* Importar */}
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--tp-text)' }}>3. Importar</p>
            <p className="text-xs mb-2.5" style={{ color: 'var(--tp-text-2)' }}>
              Sube un CSV (como la plantilla) para crear tareas en bloque en este proyecto.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-50"
              style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}
            >
              <Upload className="w-3.5 h-3.5" />
              {importing ? 'Importando…' : 'Elegir archivo e importar'}
            </button>
            {result && <p className="text-xs mt-2.5 font-medium" style={{ color: '#16a34a' }}>{result}</p>}
            {error && <p className="text-xs mt-2.5 font-medium" style={{ color: '#ef4444' }}>{error}</p>}
          </div>
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
