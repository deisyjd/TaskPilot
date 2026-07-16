'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useCurrentUser } from '@/store/useUserStore'
import { can } from '@/lib/permissions'
import { Database, TriangleAlert, Pencil, Users, BellRing, Volume2 } from 'lucide-react'
import { DeleteCompanyModal } from '@/components/admin/DeleteCompanyModal'
import { CompanyModal } from '@/components/admin/CompanyModal'
import { isReminderAlertsEnabled, setReminderAlertsEnabled, playReminderChime } from '@/lib/reminderAlerts'

export default function SettingsPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const history = useTaskStore((s) => s.history)
  const companies = useAuthStore((s) => s.companies)
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const activeCompany = companies.find((c) => c.id === activeCompanyId)
  const currentUser = useCurrentUser()
  const canEditCompany = can(currentUser, 'edit_company')
  const canDeleteCompany = can(currentUser, 'delete_company')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')

  // localStorage/Notification solo existen en el navegador — no en el render de servidor.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlertsEnabled(isReminderAlertsEnabled())
    setNotifPermission(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  }, [])

  async function handleToggleAlerts() {
    if (alertsEnabled) {
      setReminderAlertsEnabled(false)
      setAlertsEnabled(false)
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      setNotifPermission(result)
    }
    setReminderAlertsEnabled(true)
    setAlertsEnabled(true)
  }

  return (
    <div className="max-w-xl space-y-5">
      <div
        className="p-6"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-semibold text-base" style={{ color: 'var(--tp-text)' }}>
            Datos de la empresa
          </h2>
          {canEditCompany && activeCompany && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-70"
              style={{ color: 'var(--tp-text-2)' }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>
          Los datos se guardan en la base de datos, aislados por empresa.
        </p>

        <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: 'var(--tp-bg)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--tp-text)' }}>
              {tasks.length} tareas · {history.length} eventos de historial
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              Empresa activa: {activeCompany?.name ?? '—'}
            </p>
          </div>
        </div>

        {canEditCompany && (
          <Link
            href="/admin/users"
            className="mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)' }}
          >
            <Users className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
            Gestionar integrantes
          </Link>
        )}
      </div>

      <div
        className="p-6"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
        }}
      >
        <h2 className="font-semibold text-base mb-1 flex items-center gap-2" style={{ color: 'var(--tp-text)' }}>
          <BellRing className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
          Notificaciones de recordatorios
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>
          Suena y muestra un aviso cuando un recordatorio se vence, aunque Wipli esté en otra pestaña o pantalla —
          solo necesita seguir abierto en el navegador.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAlerts}
            className="px-5 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85"
            style={{
              backgroundColor: alertsEnabled ? 'var(--tp-lime)' : 'var(--tp-bg)',
              color: alertsEnabled ? 'var(--tp-dark)' : 'var(--tp-text)',
            }}
          >
            {alertsEnabled ? 'Activadas' : 'Activar'}
          </button>
          {alertsEnabled && (
            <button
              onClick={() => playReminderChime()}
              className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-70"
              style={{ color: 'var(--tp-text-2)' }}
            >
              <Volume2 className="w-3.5 h-3.5" />
              Probar sonido
            </button>
          )}
        </div>

        {alertsEnabled && notifPermission === 'denied' && (
          <p className="text-xs mt-3" style={{ color: '#DC2626' }}>
            Bloqueaste los avisos emergentes del navegador para este sitio — el sonido sí funcionará, pero no verás
            la notificación visual. Puedes habilitarla desde la configuración de tu navegador.
          </p>
        )}
        {notifPermission === 'unsupported' && (
          <p className="text-xs mt-3" style={{ color: 'var(--tp-text-2)' }}>
            Tu navegador no soporta notificaciones emergentes — solo se reproducirá el sonido.
          </p>
        )}
      </div>

      <div
        className="p-6"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
        }}
      >
        <h2 className="font-semibold text-base mb-1" style={{ color: 'var(--tp-text)' }}>
          Acerca de TaskPilot
        </h2>
        <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
          v1.0 · Gestión de clientes, publicaciones y operación semanal
        </p>
        <div className="mt-4 space-y-2 text-xs" style={{ color: 'var(--tp-text-2)' }}>
          <p>Stack: Next.js · TypeScript · Tailwind CSS · shadcn/ui · Zustand · Prisma · PostgreSQL</p>
        </div>
      </div>

      {canDeleteCompany && activeCompany && (
        <div
          className="p-6"
          style={{
            backgroundColor: 'var(--tp-surface)',
            borderRadius: 'var(--tp-r-card)',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          <h2 className="font-semibold text-base mb-1 flex items-center gap-2" style={{ color: 'var(--tp-text)' }}>
            <TriangleAlert className="w-4 h-4" style={{ color: '#ef4444' }} />
            Zona de peligro
          </h2>
          <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>
            Eliminar la empresa activa borra permanentemente sus proyectos, tareas e historial.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={companies.length <= 1}
            className="px-5 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
          >
            Eliminar &quot;{activeCompany.name}&quot;
          </button>
          {companies.length <= 1 && (
            <p className="text-xs mt-2.5" style={{ color: 'var(--tp-text-2)' }}>
              No puedes eliminar tu única empresa.
            </p>
          )}
        </div>
      )}

      {activeCompany && (
        <>
          <CompanyModal
            open={showEditModal}
            company={activeCompany}
            onClose={() => setShowEditModal(false)}
          />
          <DeleteCompanyModal
            open={showDeleteModal}
            company={activeCompany}
            onClose={() => setShowDeleteModal(false)}
          />
        </>
      )}
    </div>
  )
}
