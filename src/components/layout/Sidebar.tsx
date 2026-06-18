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
import { PROJECTS } from '@/data/projects'
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
    <aside
      className="flex flex-col w-64 min-h-screen shrink-0"
      style={{ backgroundColor: 'var(--tp-dark)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#1E2226', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Main body */}
            <path d="M2 17L18 3L14.5 18L9 12.5L2 17Z" fill="#DFFF5F"/>
            {/* Inner wing fold */}
            <path d="M9 12.5L10.8 17L14.5 18" fill="#BFDB4A"/>
            {/* Tail piece */}
            <path d="M5.5 14.5L8 17L9.5 14.5L9 12.5Z" fill="#CBEF43"/>
          </svg>
        </div>
        <span className="font-semibold text-lg tracking-tight">
          <span className="text-white">Wipl</span><span style={{ color: 'var(--tp-lime)' }}>i</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'text-[#111318]'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
              style={isActive ? { backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' } : {}}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Projects */}
      <div className="px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 px-1 mb-2">
          Proyectos
        </p>
        <div className="space-y-0.5">
          {PROJECTS.slice(0, 7).map((project) => (
            <Link
              key={project.id}
              href={`/board`}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </Link>
          ))}
        </div>
      </div>

      {/* User card */}
      <div className="px-3 pb-5">
        <div
          className="flex items-center gap-3 px-3 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}
          >
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Deisy</p>
            <p className="text-xs text-white/40 truncate">Directora</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
