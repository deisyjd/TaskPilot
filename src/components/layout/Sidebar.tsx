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
  MessageSquare,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useCurrentUser } from '@/store/useUserStore'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'

const mainNav = [
  { label: 'Dashboard',        href: '/dashboard',      icon: LayoutDashboard },
  { label: 'Tablero',          href: '/board',           icon: Columns3 },
  { label: 'Línea de tiempo',  href: '/timeline',        icon: CalendarDays },
  { label: 'Revisión semanal', href: '/weekly-review',   icon: ClipboardCheck },
  { label: 'Responsables',     href: '/users',           icon: Users },
  { label: 'Chats',            href: '/chats',           icon: MessageSquare },
  { label: 'Historial',        href: '/history',         icon: History },
  { label: 'Configuración',    href: '/settings',        icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const projects = useTaskStore((s) => s.projects)
  const currentUser = useCurrentUser()
  const isAdmin = can(currentUser, 'create_user')

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

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
          <span className="text-white">Wip</span>
          <span style={{ color: 'var(--tp-lime)' }}>li</span>
        </span>
      </div>

      {/* Main nav */}
      <nav className="px-3 py-2 space-y-0.5">
        {mainNav.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active ? 'text-[#111318]' : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
              style={active ? { backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' } : {}}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* Admin — solo visible para admin */}
        {isAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive('/admin') ? 'text-[#111318]' : 'text-white/60 hover:text-white hover:bg-white/8'
            )}
            style={isActive('/admin') ? { backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' } : {}}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Administración
          </Link>
        )}
      </nav>

      {/* Projects */}
      <div className="px-4 py-4 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 px-1 mb-2">
          Proyectos
        </p>
        {projects.filter((p) => p.status !== 'inactive').length === 0 ? (
          <p className="text-xs text-white/25 px-2 py-2">Sin proyectos activos</p>
        ) : (
          <div className="space-y-0.5">
            {projects
              .filter((p) => p.status !== 'inactive')
              .slice(0, 8)
              .map((project) => {
                const active = isActive(`/projects/${project.id}`)
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={cn(
                      'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-all',
                      active
                        ? 'text-white bg-white/10'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                )
              })}
          </div>
        )}
      </div>

      {/* User card */}
      <div className="px-3 pb-5">
        <Link
          href="/admin/users"
          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-white/8"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          {currentUser?.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}
            >
              {currentUser?.initials ?? 'D'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{currentUser?.name ?? 'Deisy'}</p>
            <p className="text-xs text-white/40 truncate">{currentUser?.role ?? 'Directora'}</p>
          </div>
          {isAdmin && (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--tp-lime)' }} />
          )}
        </Link>
      </div>
    </aside>
  )
}
