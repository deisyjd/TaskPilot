'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'Resumen general de operaciones' },
  '/board': { title: 'Tablero', description: 'Gestión de tareas por estado' },
  '/timeline': { title: 'Línea de tiempo', description: 'Vista semanal de tareas y publicaciones' },
  '/weekly-review': { title: 'Revisión semanal', description: 'Cumplimiento y pendientes de la semana' },
  '/users': { title: 'Responsables', description: 'Carga de trabajo por usuario' },
  '/history': { title: 'Historial', description: 'Registro de actividad y cambios' },
  '/settings': { title: 'Configuración', description: 'Preferencias del sistema' },
}

export function Header() {
  const pathname = usePathname()
  const page = pageTitles[pathname] ?? { title: 'TaskPilot', description: '' }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{page.title}</h1>
        {page.description && (
          <p className="text-sm text-gray-400 mt-0.5">{page.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700">
          <Bell className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
          <span className="text-white text-xs font-semibold">D</span>
        </div>
      </div>
    </header>
  )
}
