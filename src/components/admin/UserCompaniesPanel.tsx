'use client'

import { useEffect, useState } from 'react'
import { useUserStore, UserCompanyAccess } from '@/store/useUserStore'

interface Props {
  userId: string
  excludeCompanyId?: string
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Miembro' },
  { value: 'viewer', label: 'Viewer' },
]

export function UserCompaniesPanel({ userId, excludeCompanyId }: Props) {
  const fetchUserCompanies = useUserStore((s) => s.fetchUserCompanies)
  const setUserCompany = useUserStore((s) => s.setUserCompany)
  const removeUserCompany = useUserStore((s) => s.removeUserCompany)

  const [rows, setRows] = useState<UserCompanyAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchUserCompanies(userId).then((data) => {
      if (!active) return
      setRows(data.filter((c) => c.companyId !== excludeCompanyId))
      setLoading(false)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, excludeCompanyId])

  async function toggle(row: UserCompanyAccess) {
    setPendingId(row.companyId)
    setError('')
    if (row.role) {
      const result = await removeUserCompany(userId, row.companyId)
      if (result.ok) {
        setRows((rs) => rs.map((r) => (r.companyId === row.companyId ? { ...r, role: null } : r)))
      } else {
        setError(result.error ?? 'No se pudo quitar el acceso a esa empresa.')
      }
    } else {
      const ok = await setUserCompany(userId, row.companyId, 'member')
      if (ok) {
        setRows((rs) => rs.map((r) => (r.companyId === row.companyId ? { ...r, role: 'member' } : r)))
      } else {
        setError('No se pudo dar acceso a esa empresa.')
      }
    }
    setPendingId(null)
  }

  async function changeRole(row: UserCompanyAccess, role: string) {
    setPendingId(row.companyId)
    setError('')
    const ok = await setUserCompany(userId, row.companyId, role)
    if (ok) setRows((rs) => rs.map((r) => (r.companyId === row.companyId ? { ...r, role } : r)))
    else setError('No se pudo cambiar el rol en esa empresa.')
    setPendingId(null)
  }

  if (loading) {
    return <p className="text-xs" style={{ color: 'var(--tp-text-2)' }}>Cargando empresas…</p>
  }
  if (rows.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium" style={{ color: 'var(--tp-text-2)' }}>
        Acceso a otras empresas
      </p>
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div
            key={row.companyId}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--tp-r-input)] border"
            style={{ borderColor: 'var(--tp-border)', opacity: pendingId === row.companyId ? 0.6 : 1 }}
          >
            <div className="w-5 h-5 rounded-md shrink-0" style={{ backgroundColor: row.color }} />
            <span className="text-sm flex-1 truncate" style={{ color: 'var(--tp-text)' }}>{row.name}</span>
            {row.role && (
              <select
                value={row.role}
                onChange={(e) => changeRole(row, e.target.value)}
                disabled={pendingId === row.companyId}
                className="text-xs rounded-full px-2.5 py-1 border outline-none cursor-pointer"
                style={{ borderColor: 'var(--tp-border)', background: 'var(--tp-bg)', color: 'var(--tp-text)' }}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            <input
              type="checkbox"
              checked={Boolean(row.role)}
              disabled={pendingId === row.companyId}
              onChange={() => toggle(row)}
              className="w-4 h-4 rounded shrink-0"
              style={{ accentColor: 'var(--tp-dark)' }}
            />
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
