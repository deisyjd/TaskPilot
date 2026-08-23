'use client'

import { toast } from 'sonner'
import { MessageCircle, BellRing, Bell } from 'lucide-react'

// Toasts con icono y color por tipo de alerta. Centraliza el estilo para que
// chat / recordatorio / notificación se vean consistentes en toda la app.
// Ver https://sonner.emilkowal.ski/styling — usamos `icon` + `style` por toast.

interface NotifyOptions {
  description?: string
  action?: { label: string; onClick: () => void }
}

const COLORS = {
  chat: '#2563EB', // azul
  reminder: '#8B5CF6', // morado (igual que la campana de recordatorios)
  alert: '#F59E0B', // ámbar
} as const

function base(color: string, opts: NotifyOptions) {
  return {
    description: opts.description,
    action: opts.action,
    // Acento de color a la izquierda del toast.
    style: { borderLeft: `4px solid ${color}` },
  }
}

export function notifyChat(title: string, opts: NotifyOptions = {}) {
  return toast(title, {
    icon: <MessageCircle className="w-4 h-4" style={{ color: COLORS.chat }} />,
    ...base(COLORS.chat, opts),
  })
}

export function notifyReminder(title: string, opts: NotifyOptions = {}) {
  return toast(title, {
    icon: <BellRing className="w-4 h-4" style={{ color: COLORS.reminder }} />,
    ...base(COLORS.reminder, opts),
  })
}

export function notifyAlert(title: string, opts: NotifyOptions = {}) {
  return toast(title, {
    icon: <Bell className="w-4 h-4" style={{ color: COLORS.alert }} />,
    ...base(COLORS.alert, opts),
  })
}
