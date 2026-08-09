'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/useAuthStore'
import { ShieldCheck, Copy, Check, Eye, EyeOff } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onEnabled: () => void
}

type Step = 'password' | 'scan' | 'backup-codes'

export function TwoFactorSetupModal({ open, onClose, onEnabled }: Props) {
  const [step, setStep] = useState<Step>('password')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)

  function reset() {
    setStep('password')
    setPassword('')
    setShowPassword(false)
    setQrCodeDataUrl('')
    setSecret('')
    setCode('')
    setBackupCodes([])
    setCopied(false)
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleStartSetup() {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'No se pudo iniciar la configuración')
        return
      }
      setQrCodeDataUrl(data.qrCodeDataUrl)
      setSecret(data.secret)
      setStep('scan')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmCode() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Código inválido')
        return
      }
      setBackupCodes(data.backupCodes)
      setStep('backup-codes')
      const me = await fetch('/api/auth/me').then((r) => r.json())
      login(me)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n')).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleFinish() {
    reset()
    onEnabled()
  }

  const inputStyle: React.CSSProperties = {
    height: '44px',
    padding: '0 14px',
    outline: 'none',
    color: 'var(--tp-text)',
    fontSize: '14px',
    width: '100%',
    borderRadius: '12px',
    border: '1px solid var(--tp-border)',
    backgroundColor: 'var(--tp-bg)',
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden"
        style={{ maxWidth: '440px', width: '92vw', borderRadius: '28px', border: '1px solid var(--tp-border)' }}
      >
        <div
          className="flex items-center gap-3 px-6 pt-6 pb-5"
          style={{ borderBottom: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(223,255,95,0.35)' }}>
            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--tp-dark)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
              Activar autenticación en dos pasos
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              {step === 'password' && 'Confirma tu contraseña para empezar'}
              {step === 'scan' && 'Escanea el código con tu app autenticadora'}
              {step === 'backup-codes' && 'Guarda tus códigos de respaldo'}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 'password' && (
            <>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña actual"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartSetup()}
                  autoFocus
                  style={{ ...inputStyle, paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: 'var(--tp-text-2)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
            </>
          )}

          {step === 'scan' && (
            <>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeDataUrl} alt="Código QR para 2FA" width={200} height={200} style={{ borderRadius: '12px' }} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--tp-text-2)' }}>
                  ¿No puedes escanear? Ingresa este código manualmente:
                </p>
                <p
                  className="text-xs font-mono px-3 py-2 rounded-lg break-all"
                  style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)' }}
                >
                  {secret}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--tp-text-2)' }}>
                  Código de verificación
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmCode()}
                  autoFocus
                  className="text-center tracking-widest font-semibold"
                  style={inputStyle}
                />
              </div>
              {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
            </>
          )}

          {step === 'backup-codes' && (
            <>
              <p className="text-xs" style={{ color: '#ef4444', fontWeight: 600 }}>
                Guarda estos códigos ahora — no se volverán a mostrar. Cada uno funciona una sola vez, por si pierdes acceso a tu app autenticadora.
              </p>
              <div
                className="grid grid-cols-2 gap-2 p-4 rounded-xl font-mono text-sm"
                style={{ backgroundColor: 'var(--tp-bg)', color: 'var(--tp-text)' }}
              >
                {backupCodes.map((c) => <span key={c}>{c}</span>)}
              </div>
              <button
                onClick={handleCopyBackupCodes}
                className="flex items-center gap-1.5 text-xs font-medium transition-all hover:opacity-70"
                style={{ color: 'var(--tp-text-2)' }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar códigos'}
              </button>
            </>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid var(--tp-border)', backgroundColor: 'var(--tp-surface)' }}
        >
          {step !== 'backup-codes' && (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-sm font-medium rounded-full transition-all hover:opacity-70"
              style={{ backgroundColor: 'var(--tp-bg-2)', color: 'var(--tp-text-2)' }}
            >
              Cancelar
            </button>
          )}
          {step === 'password' && (
            <button
              onClick={handleStartSetup}
              disabled={!password || loading}
              className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
              style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
            >
              {loading ? 'Verificando…' : 'Continuar'}
            </button>
          )}
          {step === 'scan' && (
            <button
              onClick={handleConfirmCode}
              disabled={!code.trim() || loading}
              className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85 disabled:opacity-40"
              style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
            >
              {loading ? 'Confirmando…' : 'Confirmar'}
            </button>
          )}
          {step === 'backup-codes' && (
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 text-sm font-semibold rounded-full transition-all hover:opacity-85"
              style={{ backgroundColor: 'var(--tp-dark)', color: 'var(--tp-lime)' }}
            >
              Ya guardé mis códigos
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
