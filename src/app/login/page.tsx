'use client'

import { useState, useEffect, FormEvent } from 'react'
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

// Errores devueltos por el callback de Google (/api/auth/google/callback) —
// llegan como ?error=... en la URL de /login.
const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: 'El inicio de sesión con Google no está disponible ahora mismo.',
  google_cancelled: 'Cancelaste el inicio de sesión con Google.',
  google_state: 'La sesión con Google expiró. Intenta de nuevo.',
  google_failed: 'No pudimos verificar tu cuenta de Google. Intenta de nuevo.',
  google_no_account: 'Tu cuenta de Google no está autorizada. Pide acceso a un administrador.',
  no_company: 'Tu usuario no tiene una empresa asignada. Contacta a un administrador.',
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

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

  // Si venimos de un fallo del callback de Google, el motivo llega en ?error=.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error')
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(GOOGLE_ERRORS[code] ?? 'No se pudo iniciar sesión con Google.')
      // Limpia el parámetro para que el mensaje no reaparezca al recargar.
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

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

          {/* Google sign-in — solo en producción; en local se entra únicamente
              con usuario y contraseña. */}
          {process.env.NODE_ENV === 'production' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--tp-border)' }} />
                <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>o</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--tp-border)' }} />
              </div>

              <button
                type="button"
                onClick={() => { window.location.href = '/api/auth/google' }}
                className="w-full flex items-center justify-center gap-2.5 text-sm font-semibold transition-all hover:opacity-80"
                style={{
                  height: '46px',
                  backgroundColor: 'var(--tp-surface)',
                  color: 'var(--tp-text)',
                  border: '1px solid var(--tp-border)',
                  borderRadius: 'var(--tp-r-btn)',
                }}
              >
                <GoogleIcon />
                Continuar con Google
              </button>
            </>
          )}

          {/* Hint */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--tp-text-2)' }}>
            Acceso restringido · Solo equipo Wipli
          </p>
        </div>
      </div>
    </div>
  )
}
