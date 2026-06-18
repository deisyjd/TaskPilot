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
        <img
          src="/wipli-icon.png"
          alt="Wipli"
          width={36}
          height={36}
          className="rounded-xl shrink-0"
          style={{ objectFit: 'cover' }}
        />
        <span className="font-semibold text-lg tracking-tight">
          <span className="text-white">Wip</span><span style={{ color: 'var(--tp-lime)' }}>li</span>
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
