'use client'

import { useState } from 'react'
import { Search, Edit2, UserCheck, UserX } from 'lucide-react'
import { User, UserRole } from '@/types'
import { useUserStore, useCurrentUser } from '@/store/useUserStore'
import { useTaskStore } from '@/store/useTaskStore'
import { can } from '@/lib/permissions'
import { UserForm } from '@/components/admin/UserForm'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  member: 'Miembro',
  viewer: 'Viewer',
}

const ROLE_BADGE_STYLE: Record<UserRole, React.CSSProperties> = {
  admin: { background: 'var(--tp-lime)', color: 'var(--tp-darker)' },
  member: { background: '#dbeafe', color: '#1d4ed8' },
  viewer: { background: '#f3f4f6', color: '#6b7280' },
}

const ALL_ROLES: (UserRole | 'all')[] = ['all', 'admin', 'member', 'viewer']

function UserAvatar({ user }: { user: User }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 ${user.color}`}
    >
      {user.initials}
    </div>
  )
}

export function UserList() {
  const users = useUserStore((s) => s.users)
  const deactivateUser = useUserStore((s) => s.deactivateUser)
  const activateUser = useUserStore((s) => s.activateUser)
  const tasks = useTaskStore((s) => s.tasks)
  const currentUser = useCurrentUser()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const canEdit = can(currentUser, 'edit_user')
  const canDeactivate = can(currentUser, 'deactivate_user')

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.userRole === roleFilter
    return matchesSearch && matchesRole
  })

  function getTaskCount(userName: string): number {
    return tasks.filter((t) => t.assignee === userName).length
  }

  return (
    <>
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--tp-text-2)' }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-[var(--tp-r-input)] border outline-none transition-all focus:border-[var(--tp-lime)]"
            style={{
              background: 'var(--tp-surface)',
              borderColor: 'var(--tp-border)',
              color: 'var(--tp-text)',
            }}
          />
        </div>

        {/* Role filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-[var(--tp-r-btn)] text-xs font-medium transition-all"
              style={
                roleFilter === r
                  ? { background: 'var(--tp-darker)', color: 'var(--tp-lime)' }
                  : {
                      background: 'var(--tp-surface)',
                      color: 'var(--tp-text-2)',
                      border: '1px solid var(--tp-border)',
                    }
              }
            >
              {r === 'all' ? 'Todos' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* User grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'var(--tp-surface)' }}
          >
            👤
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--tp-text-2)' }}>
            No se encontraron usuarios
          </p>
          <p className="text-xs" style={{ color: 'var(--tp-text-2)', opacity: 0.6 }}>
            Intenta ajustar tu búsqueda o filtros
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => {
            const taskCount = getTaskCount(u.name)
            const isActive = u.status !== 'inactive'

            return (
              <div
                key={u.id}
                className="rounded-[var(--tp-r-card)] border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md"
                style={{
                  background: 'var(--tp-surface)',
                  borderColor: 'var(--tp-border)',
                  boxShadow: 'var(--tp-shadow)',
                }}
              >
                {/* Top row: avatar + status dot */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <UserAvatar user={u} />
                      {/* Status dot */}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--tp-surface)] ${
                          isActive ? 'bg-green-500' : 'bg-red-400'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--tp-text)', fontFamily: 'Poppins, sans-serif' }}
                      >
                        {u.name}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: 'var(--tp-text-2)' }}
                        title={u.email}
                      >
                        {u.email ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Role badge */}
                  {u.userRole && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                      style={ROLE_BADGE_STYLE[u.userRole]}
                    >
                      {ROLE_LABELS[u.userRole]}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--tp-text-2)' }}>
                  <span className="truncate">{u.role || '—'}</span>
                  <span className="ml-auto flex-shrink-0">
                    {taskCount} tarea{taskCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Actions */}
                {(canEdit || canDeactivate) && (
                  <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--tp-border)' }}>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[var(--tp-r-btn)] text-xs font-medium border transition-all hover:bg-[var(--tp-bg-2)] active:scale-95"
                        style={{ borderColor: 'var(--tp-border)', color: 'var(--tp-text-2)' }}
                      >
                        <Edit2 size={12} />
                        Editar
                      </button>
                    )}

                    {canDeactivate && (
                      <button
                        type="button"
                        onClick={() =>
                          isActive ? deactivateUser(u.id) : activateUser(u.id)
                        }
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[var(--tp-r-btn)] text-xs font-medium border transition-all active:scale-95 ${
                          isActive
                            ? 'hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                            : 'hover:bg-green-50 hover:border-green-200 hover:text-green-600'
                        }`}
                        style={{ borderColor: 'var(--tp-border)', color: 'var(--tp-text-2)' }}
                      >
                        {isActive ? (
                          <>
                            <UserX size={12} />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} />
                            Activar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      <UserForm
        open={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </>
  )
}
