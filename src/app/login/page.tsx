'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'

const features = [
  'Tablero Kanban con arrastrar y soltar',
  'Revisión semanal de cumplimiento',
  'Gestión de proyectos y responsables',
  'Línea de tiempo y alertas automáticas',
]

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const fetchAll = useTaskStore((s) => s.fetchAll)
  const fetchUsers = useUserStore((s) => s.fetchUsers)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Por favor ingresa tu correo y contraseña.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Credenciales inválidas.')
        return
      }

      login(data)
      fetchAll()
      fetchUsers()
      router.replace('/dashboard')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">

      {/* ── Left panel — dark brand ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[58%] p-12 relative overflow-hidden"
        style={{ backgroundColor: 'var(--tp-dark)' }}
      >
        {/* Background texture dots */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Top: Logo */}
        <div className="relative flex items-center gap-3">
          <img
            src="/wipli-logo.png"
            alt="Wipli"
            width={40}
            height={40}
            className="rounded-xl"
            style={{ objectFit: 'cover' }}
          />
          <span
            className="text-white text-2xl tracking-tight leading-none"
            style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif', fontWeight: 800 }}
          >
            Wip<span style={{ color: 'var(--tp-lime)' }}>li</span>
          </span>
        </div>

        {/* Center: headline */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--tp-lime)' }}
            >
              Gestión operacional
            </p>
            <h1
              className="text-4xl xl:text-5xl font-bold text-white leading-tight"
              style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif' }}
            >
              Todo tu equipo,
              <br />
              una sola vista.
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-sm">
              Centraliza clientes, publicaciones y entregas. Sin hojas, sin caos.
            </p>
          </div>

          {/* Features list */}
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle2
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--tp-lime)' }}
                />
                <span className="text-sm text-white/70">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: version */}
        <div className="relative">
          <p className="text-xs text-white/25">v1.0 · Wipli · 2025</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div
        className="flex flex-col flex-1 items-center justify-center p-6 sm:p-10"
        style={{ backgroundColor: 'var(--tp-bg)' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <img
            src="/wipli-logo.png"
            alt="Wipli"
            width={36}
            height={36}
            className="rounded-xl"
            style={{ objectFit: 'cover' }}
          />
          <span
            className="text-2xl tracking-tight leading-none"
            style={{
              fontFamily: 'var(--font-sora), system-ui, sans-serif',
              fontWeight: 800,
              color: 'var(--tp-dark)',
            }}
          >
            Wip<span style={{ color: '#6D28D9' }}>li</span>
          </span>
        </div>

        {/* Card */}
        <div
          className="w-full max-w-sm"
          style={{
            backgroundColor: 'var(--tp-surface)',
            borderRadius: 'var(--tp-r-card)',
            border: '1px solid var(--tp-border)',
            boxShadow: 'var(--tp-shadow-md)',
            padding: '36px 32px',
          }}
        >
          {/* Heading */}
          <div className="mb-8">
            <h2
              className="text-2xl font-bold mb-1.5"
              style={{
                fontFamily: 'var(--font-sora), system-ui, sans-serif',
                color: 'var(--tp-text)',
              }}
            >
              Bienvenida de vuelta
            </h2>
            <p className="text-sm" style={{ color: 'var(--tp-text-2)' }}>
              Ingresa con tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--tp-text-2)' }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="deisy@wipli.app"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                className="tp-input w-full text-sm"
                style={{
                  height: '44px',
                  padding: '0 14px',
                  outline: 'none',
                  color: 'var(--tp-text)',
                  fontSize: '14px',
                  transition: 'box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(223,255,95,0.35)`
                  e.currentTarget.style.borderColor = 'var(--tp-lime)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = ''
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--tp-text-2)' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  className="tp-input w-full text-sm"
                  style={{
                    height: '44px',
                    padding: '0 44px 0 14px',
                    outline: 'none',
                    color: 'var(--tp-text)',
                    fontSize: '14px',
                    transition: 'box-shadow 0.15s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 3px rgba(223,255,95,0.35)`
                    e.currentTarget.style.borderColor = 'var(--tp-lime)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-opacity hover:opacity-70"
                  style={{ color: 'var(--tp-text-2)' }}
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-xs font-medium px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold transition-all hover:opacity-88 disabled:opacity-60"
              style={{
                height: '46px',
                marginTop: '8px',
                backgroundColor: 'var(--tp-dark)',
                color: '#FFFFFF',
                borderRadius: 'var(--tp-r-btn)',
              }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--tp-text-2)' }}>
            Acceso restringido · Solo equipo Wipli
          </p>
        </div>
      </div>
    </div>
  )
}
