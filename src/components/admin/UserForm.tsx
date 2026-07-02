'use client'

import { useEffect, useState } from 'react'
import { User, UserRole } from '@/types'
import { useUserStore } from '@/store/useUserStore'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  user?: User | null
  onClose: () => void
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Miembro' },
  { value: 'viewer', label: 'Viewer' },
]

function generateInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

const COLOR_OPTIONS = [
  'bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
  'bg-rose-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
]

function randomColor(): string {
  return COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]
}

const EMPTY_FORM = {
  name: '',
  email: '',
  role: '',
  userRole: 'member' as UserRole,
  avatarUrl: '',
  status: 'active' as 'active' | 'inactive',
  password: '',
  confirmPassword: '',
}

type FormErrors = Partial<Record<keyof typeof EMPTY_FORM, string>>

export function UserForm({ open, user, onClose }: Props) {
  const addUser = useUserStore((s) => s.addUser)
  const updateUser = useUserStore((s) => s.updateUser)

  const isNew = !user

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      if (user) {
        setForm({
          name: user.name ?? '',
          email: user.email ?? '',
          role: user.role ?? '',
          userRole: user.userRole ?? 'member',
          avatarUrl: user.avatarUrl ?? '',
          status: user.status ?? 'active',
          password: '',
          confirmPassword: '',
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
      setShowPasswordSection(false)
      setShowPwd(false)
      setShowConfirm(false)
    }
  }, [open, user])

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = 'El nombre es requerido.'
    if (!form.email.trim()) errs.email = 'El email es requerido.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Email no válido.'
    if (!form.role.trim()) errs.role = 'El cargo es requerido.'

    if (isNew) {
      if (!form.password) errs.password = 'La contraseña es requerida.'
      else if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres.'
      if (form.password !== form.confirmPassword)
        errs.confirmPassword = 'Las contraseñas no coinciden.'
    } else if (showPasswordSection && form.password) {
      if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres.'
      if (form.password !== form.confirmPassword)
        errs.confirmPassword = 'Las contraseñas no coinciden.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return

    if (isNew) {
      const newUser: User = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role.trim(),
        userRole: form.userRole,
        initials: generateInitials(form.name),
        color: randomColor(),
        avatarUrl: form.avatarUrl || undefined,
        status: 'active',
        password: form.password,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      addUser(newUser)
    } else if (user) {
      const updates: Partial<User> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role.trim(),
        userRole: form.userRole,
        initials: generateInitials(form.name),
        avatarUrl: form.avatarUrl || undefined,
        status: form.status,
      }
      if (showPasswordSection && form.password) {
        updates.password = form.password
      }
      updateUser(user.id, updates)
    }

    onClose()
  }

  function field(id: keyof typeof EMPTY_FORM) {
    return {
      value: form[id] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((f) => ({ ...f, [id]: e.target.value }))
        setErrors((err) => ({ ...err, [id]: undefined }))
      },
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--tp-bg)',
    borderColor: 'var(--tp-border)',
    color: 'var(--tp-text)',
  }

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-[var(--tp-r-input)] border outline-none transition-all focus:border-[var(--tp-lime)]'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-w-lg w-full rounded-[var(--tp-r-card)] border-0 p-0 overflow-hidden"
        style={{ background: 'var(--tp-bg-2)' }}
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader
          className="px-6 pt-6 pb-4 border-b"
          style={{ borderColor: 'var(--tp-border)' }}
        >
          <div className="flex items-center justify-between">
            <DialogTitle
              className="text-base font-semibold"
              style={{ color: 'var(--tp-text)' }}
            >
              {isNew ? 'Nuevo usuario' : 'Editar usuario'}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--tp-surface)] transition-colors text-lg"
              style={{ color: 'var(--tp-text-2)' }}
            >
              ×
            </button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <ImageUploader
              value={form.avatarUrl || undefined}
              onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url ?? '' }))}
              label="Foto de perfil"
              aspectRatio="square"
              className="w-full max-w-[120px]"
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Ana García"
              className={inputClass}
              style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : 'var(--tp-border)' }}
              {...field('name')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="ana@empresa.com"
              className={inputClass}
              style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : 'var(--tp-border)' }}
              {...field('email')}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Cargo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
              Cargo / Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Diseñadora, Director de Marketing"
              className={inputClass}
              style={{ ...inputStyle, borderColor: errors.role ? '#ef4444' : 'var(--tp-border)' }}
              {...field('role')}
            />
            {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
          </div>

          {/* Rol de acceso */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
              Rol de acceso
            </label>
            <select
              className={inputClass + ' cursor-pointer'}
              style={inputStyle}
              value={form.userRole}
              onChange={(e) => setForm((f) => ({ ...f, userRole: e.target.value as UserRole }))}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Contraseña — CREAR ── */}
          {isNew && (
            <div
              className="flex flex-col gap-4 p-4 rounded-[var(--tp-r-inner)]"
              style={{ background: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tp-text-2)' }}>
                Contraseña de acceso
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className={inputClass}
                    style={{ ...inputStyle, paddingRight: '40px', borderColor: errors.password ? '#ef4444' : 'var(--tp-border)' }}
                    {...field('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--tp-text-2)' }}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    className={inputClass}
                    style={{ ...inputStyle, paddingRight: '40px', borderColor: errors.confirmPassword ? '#ef4444' : 'var(--tp-border)' }}
                    {...field('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--tp-text-2)' }}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>
            </div>
          )}

          {/* ── Contraseña — EDITAR (colapsable) ── */}
          {!isNew && (
            <div
              className="rounded-[var(--tp-r-inner)] overflow-hidden"
              style={{ border: '1px solid var(--tp-border)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection((v) => !v)
                  setForm((f) => ({ ...f, password: '', confirmPassword: '' }))
                  setErrors((e) => ({ ...e, password: undefined, confirmPassword: undefined }))
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
                style={{ background: 'var(--tp-surface)', color: 'var(--tp-text)' }}
              >
                <span>Cambiar contraseña</span>
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{
                    color: 'var(--tp-text-2)',
                    transform: showPasswordSection ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {showPasswordSection && (
                <div
                  className="flex flex-col gap-4 px-4 pb-4 pt-2"
                  style={{ background: 'var(--tp-bg)' }}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        className={inputClass}
                        style={{ ...inputStyle, paddingRight: '40px', borderColor: errors.password ? '#ef4444' : 'var(--tp-border)' }}
                        {...field('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--tp-text-2)' }}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
                      Confirmar nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repite la contraseña"
                        className={inputClass}
                        style={{ ...inputStyle, paddingRight: '40px', borderColor: errors.confirmPassword ? '#ef4444' : 'var(--tp-border)' }}
                        {...field('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--tp-text-2)' }}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado — solo en edición */}
          {!isNew && (
            <div className="flex items-center justify-between py-3 px-4 rounded-[var(--tp-r-input)] border" style={{ borderColor: 'var(--tp-border)', background: 'var(--tp-surface)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>Estado</p>
                <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
                  {form.status === 'active' ? 'Usuario activo' : 'Usuario inactivo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    status: f.status === 'active' ? 'inactive' : 'active',
                  }))
                }
                className="relative w-12 h-6 rounded-full transition-all overflow-hidden shrink-0"
                style={{ background: form.status === 'active' ? 'var(--tp-lime)' : '#D1D5DB' }}
              >
                <span
                  className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm"
                  style={{
                    left: form.status === 'active' ? '26px' : '3px',
                    transition: 'left 0.2s ease',
                  }}
                />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-end gap-3"
          style={{ borderColor: 'var(--tp-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-[var(--tp-r-btn)] text-sm font-medium border transition-all hover:bg-[var(--tp-surface)] active:scale-95"
            style={{ borderColor: 'var(--tp-border)', color: 'var(--tp-text-2)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-[var(--tp-r-btn)] text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'var(--tp-darker)', color: 'var(--tp-lime)' }}
          >
            {isNew ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
