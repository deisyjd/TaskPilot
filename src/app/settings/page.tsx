'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTaskStore } from '@/store/useTaskStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useCurrentUser } from '@/store/useUserStore'
import { can } from '@/lib/permissions'
import { Database, TriangleAlert, Pencil, Users, BellRing, Volume2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { DeleteCompanyModal } from '@/components/admin/DeleteCompanyModal'
import { CompanyModal } from '@/components/admin/CompanyModal'
import { TwoFactorSetupModal } from '@/components/settings/TwoFactorSetupModal'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
  const [show2faSetup, setShow2faSetup] = useState(false)
  const [show2faDisable, setShow2faDisable] = useState(false)
  const [disableInput, setDisableInput] = useState('')
  const [disableShowPassword, setDisableShowPassword] = useState(false)
  const [disableError, setDisableError] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

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

  async function refreshCurrentUser() {
    const res = await fetch('/api/auth/me')
    if (res.ok) login(await res.json())
  }

  function closeDisableModal() {
    setShow2faDisable(false)
    setDisableInput('')
    setDisableShowPassword(false)
    setDisableError('')
  }

  async function handleDisable2fa() {
    if (!disableInput.trim()) return
    setDisableLoading(true)
    setDisableError('')
    try {
      const isCode = /^\d{6}$/.test(disableInput.trim())
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isCode ? { code: disableInput.trim() } : { password: disableInput }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDisableError(data.error ?? 'No se pudo desactivar')
        return
      }
      await refreshCurrentUser()
      closeDisableModal()
    } catch {
      setDisableError('Error de conexión. Intenta de nuevo.')
    } finally {
      setDisableLoading(false)
    }
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
        <h2 className="font-semibold text-base mb-1 flex items-center gap-2" style={{ color: 'var(--tp-text)' }}>
          <ShieldCheck className="w-4 h-4" style={{ color: 'var(--tp-text-2)' }} />
          Seguridad
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--tp-text-2)' }}>
          Protege tu cuenta pidiendo un código de tu app autenticadora (Google Authenticator, Authy) además de tu
          contraseña al iniciar sesión.
        </p>

        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1.5 text-xs font-semibold rounded-full"
            style={{
              backgroundColor: currentUser?.twoFactorEnabled ? 'rgba(34,197,94,0.12)' : 'var(--tp-bg)',
              color: currentUser?.twoFactorEnabled ? '#16a34a' : 'var(--tp-text-2)',
            }}
          >
            {currentUser?.twoFactorEnabled ? 'Activada' : 'Desactivada'}
          </span>
          {currentUser?.twoFactorEnabled ? (
            <button
              onClick={() => setShow2faDisable(true)}
              className="px-5 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}
            >
              Desactivar
            </button>
          ) : (
            <button
              onClick={() => setShow2faSetup(true)}
              className="px-5 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85"
              style={{ backgroundColor: 'var(--tp-lime)', color: 'var(--tp-dark)' }}
            >
              Activar
            </button>
          )}
        </div>
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

      <TwoFactorSetupModal
        open={show2faSetup}
        onClose={() => setShow2faSetup(false)}
        onEnabled={async () => {
          setShow2faSetup(false)
          await refreshCurrentUser()
        }}
      />

      <Dialog open={show2faDisable} onOpenChange={(o) => !o && closeDisableModal()}>
        <DialogContent
          className="p-0 gap-0 overflow-hidden"
          style={{ maxWidth: '400px', width: '92vw', borderRadius: '28px', border: '1px solid var(--tp-border)' }}
        >
          <div
            className="flex items-center gap-3 px-6 pt-6 pb-5"
            style={{ borderBottom: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
              <ShieldCheck className="w-5 h-5" style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
                Desactivar 2FA
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
                Confirma tu contraseña o un código de tu app
              </p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div className="relative">
              <input
                type={disableShowPassword ? 'text' : 'password'}
                placeholder="Contraseña o código de 6 dígitos"
                value={disableInput}
                onChange={(e) => { setDisableInput(e.target.value); setDisableError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleDisable2fa()}
                autoFocus
                style={{
                  height: '44px',
                  padding: '0 44px 0 14px',
                  outline: 'none',
                  color: 'var(--tp-text)',
                  fontSize: '14px',
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid var(--tp-border)',
                  backgroundColor: 'var(--tp-bg)',
                }}
              />
              <button
                type="button"
                onClick={() => setDisableShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                style={{ color: 'var(--tp-text-2)' }}
              >
                {disableShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {disableError && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{disableError}</p>}
          </div>

          <div
            className="flex items-center justify-end gap-2.5 px-6 py-4"
            style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
          >
            <button
              onClick={closeDisableModal}
              className="px-5 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70"
              style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleDisable2fa}
              disabled={!disableInput.trim() || disableLoading}
              className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
              style={{ backgroundColor: '#ef4444', color: '#fff' }}
            >
              {disableLoading ? 'Desactivando…' : 'Desactivar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
