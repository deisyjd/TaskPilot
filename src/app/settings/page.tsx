'use client'

import { useTaskStore } from '@/store/useTaskStore'
import { useState } from 'react'
import { RotateCcw, Database, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const history = useTaskStore((s) => s.history)
  const resetToMockData = useTaskStore((s) => s.resetToMockData)

  const [confirmed, setConfirmed] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleReset = () => {
    if (!confirmed) { setConfirmed(true); return }
    setResetting(true)
    resetToMockData()
    setTimeout(() => { setResetting(false); setConfirmed(false) }, 1200)
  }

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
          Almacenamiento local
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>
          Todos los datos se guardan en tu navegador (localStorage). No hay servidor ni sincronización en la nube.
        </p>

        <div className="flex items-center gap-4 p-4 rounded-2xl mb-5" style={{ backgroundColor: 'var(--tp-bg)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--tp-text)' }}>
              {tasks.length} tareas · {history.length} eventos de historial
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>Guardados en taskpilot-store</p>
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: '1px solid var(--tp-border)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--tp-text-2)' }}>ZONA DE PELIGRO</p>
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>
                {confirmed ? '¿Confirmar? Esto borrará todos los cambios.' : 'Restablecer datos de prueba'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
                Vuelve a las 20 tareas y 15 eventos originales
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full shrink-0 transition-all hover:opacity-80"
              style={{
                backgroundColor: resetting ? '#16A34A' : '#DC2626',
                color: '#FFFFFF',
              }}
            >
              {resetting ? (
                <><CheckCircle2 className="w-4 h-4" />Listo</>
              ) : (
                <><RotateCcw className="w-4 h-4" />{confirmed ? 'Confirmar' : 'Restablecer'}</>
              )}
            </button>
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
          <p>Stack: Next.js · TypeScript · Tailwind CSS · shadcn/ui · Zustand</p>
          <p>Sin backend · Sin login · Sin APIs externas</p>
        </div>
      </div>
    </div>
  )
}
