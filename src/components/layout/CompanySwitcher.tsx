'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Building2, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTaskStore } from '@/store/useTaskStore'
import { useUserStore, useCurrentUser } from '@/store/useUserStore'
import { can } from '@/lib/permissions'
import { CompanyModal } from '@/components/admin/CompanyModal'

export function CompanySwitcher() {
  const companies = useAuthStore((s) => s.companies)
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const switchingCompany = useAuthStore((s) => s.switchingCompany)
  const setActiveCompany = useAuthStore((s) => s.setActiveCompany)
  const fetchAll = useTaskStore((s) => s.fetchAll)
  const fetchUsers = useUserStore((s) => s.fetchUsers)
  const currentUser = useCurrentUser()
  const canCreateCompany = can(currentUser, 'create_company')

  const [open, setOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const active = companies.find((c) => c.id === activeCompanyId)
  if (!active) return null

  const canOpen = companies.length > 1 || canCreateCompany

  async function handleSelect(companyId: string) {
    if (companyId === activeCompanyId) {
      setOpen(false)
      return
    }
    const ok = await setActiveCompany(companyId)
    if (ok) {
      setOpen(false)
      await Promise.all([fetchAll(), fetchUsers()])
    }
  }

  return (
    <div className="relative px-3 pt-2" ref={ref}>
      <button
        onClick={() => canOpen && setOpen((o) => !o)}
        disabled={!canOpen}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:bg-white/8 disabled:cursor-default"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ backgroundColor: active.color, color: '#fff' }}
        >
          {active.name.slice(0, 1).toUpperCase()}
        </div>
        <span className="flex-1 min-w-0 text-left text-xs font-semibold text-white truncate">
          {active.name}
        </span>
        {canOpen && (
          <ChevronDown
            className="w-3.5 h-3.5 shrink-0 text-white/40 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-3 right-3 mb-2 z-50 overflow-hidden"
          style={{
            borderRadius: '14px',
            border: '1px solid var(--tp-border)',
            backgroundColor: 'var(--tp-surface)',
            boxShadow: '0 12px 40px rgba(17,19,24,0.24)',
          }}
        >
          <div
            className="flex items-center gap-2 px-3.5 py-2.5"
            style={{ borderBottom: '1px solid var(--tp-border)' }}
          >
            <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--tp-text)' }}>
              Empresas
            </span>
          </div>
          {companies.length > 1 && (
            <div className={`max-h-[260px] overflow-y-auto ${switchingCompany ? 'opacity-50 pointer-events-none' : ''}`}>
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--tp-bg)]"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: c.color, color: '#fff' }}
                  >
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="flex-1 min-w-0 text-xs font-medium truncate" style={{ color: 'var(--tp-text)' }}>
                    {c.name}
                  </span>
                  {c.id === activeCompanyId && (
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--tp-lime)' }} />
                  )}
                </button>
              ))}
            </div>
          )}
          {canCreateCompany && (
            <button
              onClick={() => {
                setOpen(false)
                setShowCreateModal(true)
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--tp-bg)]"
              style={{ borderTop: companies.length > 1 ? '1px solid var(--tp-border)' : undefined }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--tp-bg-2)' }}
              >
                <Plus className="w-3.5 h-3.5" style={{ color: 'var(--tp-text-2)' }} />
              </div>
              <span className="flex-1 min-w-0 text-xs font-medium truncate" style={{ color: 'var(--tp-text)' }}>
                Nueva empresa
              </span>
            </button>
          )}
        </div>
      )}

      <CompanyModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
