'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  LogOut,
} from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useChatStore } from '@/store/useChatStore'
import { useCurrentUser } from '@/store/useUserStore'
import { useMobileNavStore } from '@/store/useMobileNavStore'
import { useAuthStore } from '@/store/useAuthStore'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { CompanySwitcher } from '@/components/layout/CompanySwitcher'

const mainNav = [
  { label: 'Dashboard',        href: '/dashboard',      icon: LayoutDashboard },
  { label: 'Tablero',          href: '/board',           icon: Columns3 },
  { label: 'Proyectos',        href: '/projects',        icon: FolderOpen },
  { label: 'Línea de tiempo',  href: '/timeline',        icon: CalendarDays },
  { label: 'Revisión semanal', href: '/weekly-review',   icon: ClipboardCheck },
  { label: 'Responsables',     href: '/users',           icon: Users },
  { label: 'Chats',            href: '/chats',           icon: MessageSquare },
  { label: 'Historial',        href: '/history',         icon: History },
  { label: 'Configuración',    href: '/settings',        icon: Settings },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const projects = useTaskStore((s) => s.projects)
  const conversations = useChatStore((s) => s.conversations)
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
  const currentUser = useCurrentUser()
  const isAdmin = can(currentUser, 'create_user')
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = async () => {
    onNavigate?.()
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    router.replace('/login')
  }

  const isActive = (href: string) => {
    if (href === '/projects') return pathname === '/projects' || pathname.startsWith('/projects/')
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <img
          src="/wipli-logo.png"
          alt="W"
          width={34}
          height={34}
          className="rounded-xl shrink-0"
          style={{ objectFit: 'cover' }}
        />
        <span
          className="text-white text-lg tracking-tight leading-none"
          style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif', fontWeight: 800 }}
        >
          Wip<span style={{ color: 'var(--tp-lime)' }}>li</span>
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
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active ? 'text-[#111318]' : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
              style={active ? { backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' } : {}}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {href === '/chats' && unreadMessages > 0 && (
                <span
                  className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor: active ? 'var(--tp-dark)' : '#EF4444',
                    color: '#FFFFFF',
                  }}
                >
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            href="/admin/users"
            onClick={onNavigate}
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
        <Link
          href="/projects"
          onClick={onNavigate}
          className="flex items-center justify-between px-1 mb-2 group"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">
            Destacados
          </p>
        </Link>
        {projects.filter((p) => p.featured).length === 0 ? (
          <Link
            href="/projects"
            onClick={onNavigate}
            className="block text-xs text-white/25 px-2 py-2 hover:text-white/40 transition-colors"
          >
            Destaca proyectos en /proyectos →
          </Link>
        ) : (
          <div className="space-y-0.5">
            {projects
              .filter((p) => p.featured)
              .slice(0, 8)
              .map((project) => {
                const active = isActive(`/projects/${project.id}`)
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    onClick={onNavigate}
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

      {/* Company switcher + user card + logout */}
      <div className="pb-2">
        <CompanySwitcher />
      </div>
      <div className="px-3 pb-5 space-y-1">
        <Link
          href="/admin/users"
          onClick={onNavigate}
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
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-white/40 hover:text-white/70 hover:bg-white/5"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const { isOpen, close } = useMobileNavStore()

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={close}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-72 overflow-y-auto transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: 'var(--tp-dark)' }}
      >
        <SidebarContent onNavigate={close} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 min-h-screen shrink-0"
        style={{ backgroundColor: 'var(--tp-dark)' }}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
