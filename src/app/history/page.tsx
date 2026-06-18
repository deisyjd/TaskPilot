'use client'

import { useMemo, useState } from 'react'
import { useTaskStore } from '@/store/useTaskStore'
import { HistoryEvent, HistoryEventType } from '@/types'
import { getProject } from '@/data/projects'
import { getUser } from '@/data/users'
import { formatDateTime } from '@/lib/dates'
import {
  Plus, Edit3, ArrowRightLeft, UserCheck, Calendar,
  CheckCircle2, AlertTriangle, Send, Activity,
  UserPlus, FolderOpen, Paperclip, MessageCircle,
} from 'lucide-react'

const EVENT_CONFIG: Record<HistoryEventType, {
  label: string
  icon: React.ReactNode
  bg: string
  color: string
}> = {
  'task-created':          { label: 'Creada',              icon: <Plus className="w-3.5 h-3.5" />,           bg: '#F0FDF4', color: '#16A34A' },
  'task-edited':           { label: 'Editada',             icon: <Edit3 className="w-3.5 h-3.5" />,          bg: '#EFF6FF', color: '#2563EB' },
  'status-changed':        { label: 'Estado cambiado',     icon: <ArrowRightLeft className="w-3.5 h-3.5" />, bg: '#FDF4FF', color: '#9333EA' },
  'assignee-changed':      { label: 'Responsable',         icon: <UserCheck className="w-3.5 h-3.5" />,      bg: '#FFF7ED', color: '#EA580C' },
  'date-changed':          { label: 'Fecha ajustada',      icon: <Calendar className="w-3.5 h-3.5" />,       bg: '#FFFBEB', color: '#D97706' },
  'task-completed':        { label: 'Completada',          icon: <CheckCircle2 className="w-3.5 h-3.5" />,   bg: '#F0FDF4', color: '#16A34A' },
  'task-overdue':          { label: 'Vencida',             icon: <AlertTriangle className="w-3.5 h-3.5" />,  bg: '#FEF2F2', color: '#DC2626' },
  'published':             { label: 'Publicada',           icon: <Send className="w-3.5 h-3.5" />,           bg: '#F0F9FF', color: '#0284C7' },
  'user-created':          { label: 'Usuario creado',      icon: <UserPlus className="w-3.5 h-3.5" />,       bg: '#F0FDF4', color: '#16A34A' },
  'user-edited':           { label: 'Usuario editado',     icon: <Edit3 className="w-3.5 h-3.5" />,          bg: '#EFF6FF', color: '#2563EB' },
  'user-deactivated':      { label: 'Usuario desactivado', icon: <UserCheck className="w-3.5 h-3.5" />,      bg: '#FEF2F2', color: '#DC2626' },
  'project-created':       { label: 'Proyecto creado',     icon: <FolderOpen className="w-3.5 h-3.5" />,     bg: '#F0FDF4', color: '#16A34A' },
  'project-edited':        { label: 'Proyecto editado',    icon: <Edit3 className="w-3.5 h-3.5" />,          bg: '#EFF6FF', color: '#2563EB' },
  'project-image-updated': { label: 'Imagen actualizada',  icon: <FolderOpen className="w-3.5 h-3.5" />,     bg: '#FDF4FF', color: '#9333EA' },
  'file-added':            { label: 'Archivo adjunto',     icon: <Paperclip className="w-3.5 h-3.5" />,      bg: '#FFFBEB', color: '#D97706' },
  'file-removed':          { label: 'Archivo eliminado',   icon: <Paperclip className="w-3.5 h-3.5" />,      bg: '#FEF2F2', color: '#DC2626' },
  'link-added':            { label: 'Enlace añadido',      icon: <Paperclip className="w-3.5 h-3.5" />,      bg: '#EFF6FF', color: '#2563EB' },
  'chat-created':          { label: 'Chat creado',         icon: <MessageCircle className="w-3.5 h-3.5" />,  bg: '#F0F9FF', color: '#0284C7' },
  'message-sent':          { label: 'Mensaje enviado',     icon: <MessageCircle className="w-3.5 h-3.5" />,  bg: '#F0F9FF', color: '#0284C7' },
}

const ALL_TYPES = Object.keys(EVENT_CONFIG) as HistoryEventType[]

function EventRow({ event }: { event: HistoryEvent }) {
  const cfg = EVENT_CONFIG[event.type]
  const project = event.project ? getProject(event.project) : undefined
  const user = getUser(event.user)

  return (
    <div className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-[var(--tp-bg)] transition-colors">
      {/* Icon */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--tp-text)' }}>
              {event.taskTitle}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
              {event.description}
            </p>
          </div>
          <span className="text-xs shrink-0 mt-0.5" style={{ color: 'var(--tp-text-2)' }}>
            {formatDateTime(event.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          {project && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>{event.project}</span>
            </div>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
          {event.user !== 'Sistema' && (
            <span className="text-xs" style={{ color: 'var(--tp-text-2)' }}>por {event.user}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const history = useTaskStore((s) => s.history)

  const [typeFilter, setTypeFilter] = useState<HistoryEventType | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return history.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false
      if (search && !(e.taskTitle ?? '').toLowerCase().includes(search.toLowerCase()) &&
          !(e.project ?? '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [history, typeFilter, search])

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, HistoryEvent[]> = {}
    for (const event of filtered) {
      const dateKey = new Date(event.timestamp).toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(event)
    }
    return Object.entries(groups)
  }, [filtered])

  const countByType = useMemo(() => {
    return ALL_TYPES.reduce<Record<string, number>>((acc, t) => {
      acc[t] = history.filter((e) => e.type === t).length
      return acc
    }, {})
  }, [history])

  const inputStyle: React.CSSProperties = {
    borderRadius: 'var(--tp-r-input)',
    border: '1px solid var(--tp-border)',
    backgroundColor: 'var(--tp-surface)',
    color: 'var(--tp-text)',
    fontSize: '13px',
    height: '36px',
    padding: '0 12px',
    outline: 'none',
  }

  return (
    <div className="space-y-5">
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { type: 'task-completed' as HistoryEventType, label: 'Completadas' },
          { type: 'task-created' as HistoryEventType, label: 'Creadas' },
          { type: 'status-changed' as HistoryEventType, label: 'Cambios de estado' },
          { type: 'task-overdue' as HistoryEventType, label: 'Vencidas' },
        ].map(({ type, label }) => {
          const cfg = EVENT_CONFIG[type]
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className="flex items-center gap-3 p-4 transition-all hover:opacity-80"
              style={{
                backgroundColor: typeFilter === type ? cfg.bg : 'var(--tp-surface)',
                borderRadius: 'var(--tp-r-inner)',
                border: `1px solid ${typeFilter === type ? cfg.color + '40' : 'var(--tp-border)'}`,
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.icon}
              </div>
              <div className="text-left">
                <p className="text-xl font-semibold" style={{ color: cfg.color }}>{countByType[type] ?? 0}</p>
                <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>{label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <input
          placeholder="Buscar en historial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '220px' }}
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
            style={{
              backgroundColor: typeFilter === 'all' ? 'var(--tp-dark)' : 'var(--tp-surface)',
              color: typeFilter === 'all' ? '#FFFFFF' : 'var(--tp-text-2)',
              border: '1px solid var(--tp-border)',
            }}
          >
            Todos
          </button>
          {ALL_TYPES.map((type) => {
            const cfg = EVENT_CONFIG[type]
            const active = typeFilter === type
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(active ? 'all' : type)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: active ? cfg.bg : 'var(--tp-surface)',
                  color: active ? cfg.color : 'var(--tp-text-2)',
                  border: `1px solid ${active ? cfg.color + '40' : 'var(--tp-border)'}`,
                }}
              >
                <span>{cfg.label}</span>
              </button>
            )
          })}
        </div>
        <span className="ml-auto text-xs" style={{ color: 'var(--tp-text-2)' }}>
          {filtered.length} eventos
        </span>
      </div>

      {/* Events list */}
      <div
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
          boxShadow: 'var(--tp-shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--tp-bg-2)' }}>
              <Activity className="w-6 h-6" style={{ color: 'var(--tp-text-2)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--tp-text-2)' }}>Sin eventos que mostrar</p>
          </div>
        ) : (
          grouped.map(([date, events]) => (
            <div key={date}>
              <div className="px-5 py-2.5 sticky top-0" style={{ backgroundColor: 'var(--tp-bg)', borderBottom: '1px solid var(--tp-border)' }}>
                <p className="text-xs font-semibold capitalize" style={{ color: 'var(--tp-text-2)' }}>{date}</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--tp-border)' }}>
                {events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
