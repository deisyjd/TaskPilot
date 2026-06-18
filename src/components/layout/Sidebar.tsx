'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Columns3,
  CalendarDays,
  ClipboardCheck,
  Users,
  History,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tablero', href: '/board', icon: Columns3 },
  { label: 'Línea de tiempo', href: '/timeline', icon: CalendarDays },
  { label: 'Revisión semanal', href: '/weekly-review', icon: ClipboardCheck },
  { label: 'Responsables', href: '/users', icon: Users },
  { label: 'Historial', href: '/history', icon: History },
  { label: 'Configuración', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r border-gray-100 bg-white shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold tracking-tight">TP</span>
        </div>
        <span className="font-semibold text-gray-900">TaskPilot</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  isActive ? 'text-violet-600' : 'text-gray-400'
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">TaskPilot v0.1 — MVP</p>
      </div>
    </aside>
  )
}
