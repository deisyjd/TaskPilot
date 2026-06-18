'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Plus } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { isOverdue } from '@/lib/dates'
import { ProjectModal } from '@/components/projects/ProjectModal'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard':    { title: 'Dashboard',             sub: 'Resumen de operaciones del día' },
  '/board':        { title: 'Tablero',               sub: 'Gestión de tareas por estado' },
  '/timeline':     { title: 'Línea de tiempo',       sub: 'Vista semanal de entregas' },
  '/weekly-review':{ title: 'Revisión semanal',      sub: 'Cumplimiento y pendientes' },
  '/users':        { title: 'Responsables',          sub: 'Carga de trabajo por usuario' },
  '/history':      { title: 'Historial',             sub: 'Registro de actividad' },
  '/settings':     { title: 'Configuración',         sub: 'Preferencias del sistema' },
  '/chats':        { title: 'Chats',                 sub: 'Mensajes y conversaciones del equipo' },
  '/admin/users':  { title: 'Administración',        sub: 'Gestión de usuarios y roles' },
  '/projects':     { title: 'Proyectos',             sub: 'Detalle del proyecto' },
}

export function Header() {
  const pathname = usePathname()
  const page = pageTitles[pathname] ?? { title: 'Wipli', sub: '' }
  const tasks = useTaskStore((s) => s.tasks)
  const alerts = tasks.filter((t) => isOverdue(t.dueDate, t.status) || t.priority === 'urgent').length
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  return (
    <header
      className="flex items-center justify-between px-6 py-4"
      style={{
        backgroundColor: 'var(--tp-bg)',
        borderBottom: '1px solid var(--tp-border)',
      }}
    >
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--tp-text)' }}>
          {page.title}
        </h1>
        {page.sub && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
            {page.sub}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
          >
            <Bell className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
          </button>
          {alerts > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: '#EF4444', fontSize: '10px' }}
            >
              {alerts > 9 ? '9+' : alerts}
            </span>
          )}
        </div>

        {/* New project button */}
        <button
          onClick={() => setProjectModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-88"
          style={{
            backgroundColor: 'var(--tp-dark)',
            color: '#FFFFFF',
            borderRadius: 'var(--tp-r-btn)',
          }}
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      <ProjectModal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
    </header>
  )
}
