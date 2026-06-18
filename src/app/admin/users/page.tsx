'use client'

import { useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { UserList } from '@/components/admin/UserList'
import { UserForm } from '@/components/admin/UserForm'
import { useCurrentUser } from '@/store/useUserStore'
import { can } from '@/lib/permissions'

export default function AdminUsersPage() {
  const currentUser = useCurrentUser()
  const [formOpen, setFormOpen] = useState(false)

  const canCreate = can(currentUser, 'create_user')

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{ background: 'var(--tp-bg)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[var(--tp-r-inner)] flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--tp-lime)' }}
            >
              <ShieldCheck size={20} style={{ color: 'var(--tp-darker)' }} />
            </div>
            <div>
              <h1
                className="text-xl font-semibold leading-tight"
                style={{
                  color: 'var(--tp-text)',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                Administración de usuarios
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
                Gestiona los miembros del equipo, sus roles y permisos
              </p>
            </div>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--tp-r-btn)] text-sm font-semibold transition-all active:scale-95 hover:opacity-90 flex-shrink-0"
              style={{ background: 'var(--tp-darker)', color: 'var(--tp-lime)' }}
            >
              <Plus size={16} />
              Nuevo usuario
            </button>
          )}
        </div>

        {/* User list */}
        <UserList />

        {/* Create user modal */}
        <UserForm
          open={formOpen}
          user={null}
          onClose={() => setFormOpen(false)}
        />
      </div>
    </div>
  )
}
