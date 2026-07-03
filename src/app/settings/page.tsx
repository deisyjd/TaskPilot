'use client'

import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Database } from 'lucide-react'

export default function SettingsPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const history = useTaskStore((s) => s.history)
  const companies = useAuthStore((s) => s.companies)
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const activeCompany = companies.find((c) => c.id === activeCompanyId)

  return (
    <div className="max-w-xl space-y-5">
      <div
        className="p-6"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
        }}
      >
        <h2 className="font-semibold text-base mb-1" style={{ color: 'var(--tp-text)' }}>
          Datos de la empresa
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>
          Los datos se guardan en la base de datos, aislados por empresa.
        </p>

        <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: 'var(--tp-bg)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--tp-text)' }}>
              {tasks.length} tareas · {history.length} eventos de historial
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              Empresa activa: {activeCompany?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div
        className="p-6"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
        }}
      >
        <h2 className="font-semibold text-base mb-1" style={{ color: 'var(--tp-text)' }}>
          Acerca de TaskPilot
        </h2>
        <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
          v1.0 · Gestión de clientes, publicaciones y operación semanal
        </p>
        <div className="mt-4 space-y-2 text-xs" style={{ color: 'var(--tp-text-2)' }}>
          <p>Stack: Next.js · TypeScript · Tailwind CSS · shadcn/ui · Zustand · Prisma · MySQL</p>
        </div>
      </div>
    </div>
  )
}
