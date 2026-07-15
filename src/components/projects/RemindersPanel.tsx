'use client'

import { useState } from 'react'
import { BellRing, Plus, Trash2 } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore } from '@/store/useUserStore'
import { isOverdue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Project, Reminder } from '@/types'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  project: Project
}

export function RemindersPanel({ project }: Props) {
  const reminders = useTaskStore((s) => s.reminders).filter((r) => r.projectId === project.id)
  const addReminder = useTaskStore((s) => s.addReminder)
  const updateReminder = useTaskStore((s) => s.updateReminder)
  const deleteReminder = useTaskStore((s) => s.deleteReminder)
  const users = useUserStore((s) => s.users).filter((u) => u.status !== 'inactive')

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [assigneeId, setAssigneeId] = useState('')
  const [error, setError] = useState('')

  const pending = reminders.filter((r) => !r.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const done = reminders.filter((r) => r.done).sort((a, b) => b.dueDate.localeCompare(a.dueDate))

  async function handleCreate() {
    if (!title.trim() || !dueDate) return
    const created = await addReminder({ projectId: project.id, title: title.trim(), dueDate, assigneeId: assigneeId || null })
    if (!created) {
      setError('No se pudo crear el recordatorio. Intenta de nuevo.')
      return
    }
    setError('')
    setTitle('')
    setAssigneeId('')
  }

  function ReminderRow({ reminder }: { reminder: Reminder }) {
    const user = users.find((u) => u.id === reminder.assigneeId)
    const overdue = !reminder.done && isOverdue(reminder.dueDate, 'pending')
    return (
      <div
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl group"
        style={{ backgroundColor: reminder.done ? 'var(--tp-bg)' : 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
      >
        <input
          type="checkbox"
          checked={reminder.done}
          onChange={() => updateReminder(reminder.id, { done: !reminder.done })}
          className="w-4 h-4 rounded cursor-pointer shrink-0"
          style={{ accentColor: '#111318' }}
        />
        <span
          className={cn('text-sm flex-1 min-w-0 truncate', reminder.done && 'line-through')}
          style={{ color: reminder.done ? 'var(--tp-text-2)' : 'var(--tp-text)' }}
        >
          {reminder.title}
        </span>
        <span className="text-xs shrink-0" style={{ color: overdue ? '#DC2626' : 'var(--tp-text-2)' }}>
          {formatDate(reminder.dueDate)}
        </span>
        {user && (
          <div
            className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0', user.color)}
            title={user.name}
          >
            {user.initials?.[0]}
          </div>
        )}
        <button
          onClick={() => deleteReminder(reminder.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          style={{ color: '#DC2626' }}
          title="Eliminar recordatorio"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          className="text-xs font-medium px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
        >
          {error}
        </div>
      )}

      {/* New reminder form */}
      <div
        className="flex flex-col gap-2 p-3.5 rounded-xl"
        style={{ backgroundColor: 'var(--tp-bg)', border: '1px solid var(--tp-border)' }}
      >
        <div className="flex gap-2 flex-wrap">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Nuevo recordatorio..."
            className="flex-1 min-w-[180px] text-sm px-3 outline-none rounded-lg border"
            style={{ height: '38px', backgroundColor: 'var(--tp-surface)', borderColor: 'var(--tp-border)', color: 'var(--tp-text)' }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-sm px-3 outline-none rounded-lg border"
            style={{ height: '38px', backgroundColor: 'var(--tp-surface)', borderColor: 'var(--tp-border)', color: 'var(--tp-text)' }}
          />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="text-sm px-3 outline-none rounded-lg border cursor-pointer"
            style={{ height: '38px', backgroundColor: 'var(--tp-surface)', borderColor: 'var(--tp-border)', color: 'var(--tp-text)' }}
          >
            <option value="">Sin asignar</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="flex items-center gap-1.5 px-4 text-sm font-medium rounded-lg transition-all hover:opacity-85 disabled:opacity-40 shrink-0"
            style={{ height: '38px', backgroundColor: 'var(--tp-dark)', color: '#FFFFFF' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center"
          style={{ backgroundColor: 'var(--tp-surface)', borderRadius: 'var(--tp-r-card)', border: '1px solid var(--tp-border)' }}
        >
          <BellRing className="w-7 h-7" style={{ color: 'var(--tp-text-2)' }} />
          <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>
            Aún no hay recordatorios para este proyecto.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pending.map((r) => <ReminderRow key={r.id} reminder={r} />)}
          {done.map((r) => <ReminderRow key={r.id} reminder={r} />)}
        </div>
      )}
    </div>
  )
}
