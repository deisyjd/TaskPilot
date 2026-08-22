'use client'

import { useState, useEffect } from 'react'
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
  FileBarChart,
  Menu,
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
  { label: 'Revisión semanal', href: '/weekly-review',   icon: ClipboardCheck, adminOnly: true },
  { label: 'Reporte mensual',  href: '/reports/monthly', icon: FileBarChart,   adminOnly: true },
  { label: 'Responsables',     href: '/users',           icon: Users,          adminOnly: true },
  { label: 'Chats',            href: '/chats',           icon: MessageSquare },
  { label: 'Historial',        href: '/history',         icon: History },
  { label: 'Configuración',    href: '/settings',        icon: Settings },
]

export const ADMIN_ONLY_PATHS = mainNav.filter((item) => item.adminOnly).map((item) => item.href)

interface ContentProps {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function SidebarContent({ onNavigate, collapsed = false, onToggleCollapse }: ContentProps) {
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

  const navLinkClass = (active: boolean) =>
    cn(
      'flex items-center rounded-xl text-sm font-medium transition-all',
      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      active ? 'text-[#111318]' : 'text-white/60 hover:text-white hover:bg-white/8'
    )

  const featured = projects.filter((p) => p.featured)

  return (
    <>
      {/* Logo + toggle */}
      <div className={cn('flex pt-6 pb-5', collapsed ? 'flex-col items-center gap-3 px-2' : 'items-center justify-between px-5')}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 min-w-0">
          <img src="/wipli-logo.png" alt="Wipli" width={34} height={34} className="rounded-xl shrink-0" style={{ objectFit: 'cover' }} />
          {!collapsed && (
            <span className="text-white text-lg tracking-tight leading-none" style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif', fontWeight: 800 }}>
              Wip<span style={{ color: 'var(--tp-lime)' }}>li</span>
            </span>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menú' : 'Comprimir menú'}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all text-white/60 hover:text-white hover:bg-white/8"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="px-3 py-2 space-y-0.5">
        {mainNav.filter((item) => !item.adminOnly || isAdmin).map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          const showChatDot = href === '/chats' && unreadMessages > 0
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={navLinkClass(active)}
              style={active ? { backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' } : {}}
            >
              <span className="relative flex items-center justify-center">
                <Icon className="w-4 h-4 shrink-0" />
                {collapsed && showChatDot && (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                )}
              </span>
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && showChatDot && (
                <span
                  className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: active ? 'var(--tp-dark)' : '#EF4444', color: '#FFFFFF' }}
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
            title={collapsed ? 'Administración' : undefined}
            className={navLinkClass(isActive('/admin'))}
            style={isActive('/admin') ? { backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' } : {}}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="flex-1">Administración</span>}
          </Link>
        )}
      </nav>

      {/* Featured projects */}
      <div className={cn('py-4 shrink-0', collapsed ? 'px-2' : 'px-4')}>
        {!collapsed && (
          <Link href="/projects" onClick={onNavigate} className="flex items-center justify-between px-1 mb-2 group">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">
              Destacados
            </p>
          </Link>
        )}

        {featured.length === 0 ? (
          !collapsed && (
            <Link href="/projects" onClick={onNavigate} className="block text-xs text-white/25 px-2 py-2 hover:text-white/40 transition-colors">
              Destaca proyectos en /proyectos →
            </Link>
          )
        ) : (
          <div className={cn('max-h-[112px] overflow-y-auto tp-scroll-subtle', collapsed ? 'flex flex-col items-center gap-2' : 'space-y-0.5 pr-1 -mr-1')}>
            {featured.map((project) => {
              const active = isActive(`/projects/${project.id}`)
              return collapsed ? (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  onClick={onNavigate}
                  title={project.name}
                  className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all', active ? 'bg-white/10' : 'hover:bg-white/5')}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                </Link>
              ) : (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs transition-all',
                    active ? 'text-white bg-white/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  )}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <span className="truncate">{project.name}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Company switcher (solo expandido) */}
      {!collapsed && (
        <div className="pb-2">
          <CompanySwitcher />
        </div>
      )}

      {/* User card + logout */}
      <div className={cn('pb-5 space-y-1', collapsed ? 'px-2 flex flex-col items-center mt-auto' : 'px-3')}>
        <Link
          href="/admin/users"
          onClick={onNavigate}
          title={collapsed ? currentUser?.name : undefined}
          className={cn(
            'flex items-center rounded-xl transition-all hover:bg-white/8',
            collapsed ? 'justify-center w-11 h-11 p-0' : 'gap-3 px-3 py-3'
          )}
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          {currentUser?.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}>
              {currentUser?.initials ?? 'D'}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.name ?? 'Deisy'}</p>
                <p className="text-xs text-white/40 truncate">{currentUser?.role ?? 'Directora'}</p>
              </div>
              {isAdmin && <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--tp-lime)' }} />}
            </>
          )}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'flex items-center rounded-xl text-sm transition-all text-white/40 hover:text-white/70 hover:bg-white/5',
            collapsed ? 'justify-center w-11 h-11' : 'w-full gap-3 px-3 py-2.5'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const { isOpen, close } = useMobileNavStore()
  const [collapsed, setCollapsed] = useState(false)

  // La preferencia de sidebar comprimido vive en localStorage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem('tp-sidebar-collapsed') === '1') setCollapsed(true)
  }, [])

  const toggleCollapse = () =>
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('tp-sidebar-collapsed', next ? '1' : '0')
      return next
    })

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={close} />}

      {/* Mobile drawer (siempre expandido) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-72 overflow-y-auto transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ backgroundColor: 'var(--tp-dark)' }}
      >
        <SidebarContent onNavigate={close} />
      </aside>

      {/* Desktop sidebar (colapsable) */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen shrink-0 overflow-y-auto tp-scroll-subtle transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-20' : 'w-64'
        )}
        style={{ backgroundColor: 'var(--tp-dark)' }}
      >
        <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>
    </>
  )
}
