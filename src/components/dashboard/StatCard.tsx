import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
  variant?: 'default' | 'danger' | 'warning' | 'lime' | 'dark'
}

export function StatCard({ title, value, icon, description, variant = 'default' }: StatCardProps) {
  const isLime = variant === 'lime'
  const isDark = variant === 'dark'

  const bg = isLime ? 'var(--tp-lime)' : isDark ? 'var(--tp-dark)' : 'var(--tp-surface)'
  const textColor = isLime || isDark ? (isLime ? 'var(--tp-dark)' : '#FFFFFF') : 'var(--tp-text)'
  const subColor = isLime ? 'rgba(17,19,24,0.55)' : isDark ? 'rgba(255,255,255,0.5)' : 'var(--tp-text-2)'
  const iconBg = isLime
    ? 'rgba(17,19,24,0.12)'
    : isDark
    ? 'rgba(255,255,255,0.1)'
    : variant === 'danger'
    ? '#FEE2E2'
    : variant === 'warning'
    ? '#FEF3C7'
    : 'var(--tp-bg-2)'

  const iconColor = isLime
    ? 'var(--tp-dark)'
    : isDark
    ? '#FFFFFF'
    : variant === 'danger'
    ? '#EF4444'
    : variant === 'warning'
    ? '#D97706'
    : 'var(--tp-text-2)'

  const valueColor = isLime || isDark
    ? textColor
    : variant === 'danger'
    ? '#EF4444'
    : variant === 'warning'
    ? '#D97706'
    : 'var(--tp-text)'

  return (
    <div
      className="p-5 flex flex-col gap-4 transition-all"
      style={{
        backgroundColor: bg,
        borderRadius: 'var(--tp-r-card)',
        boxShadow: 'var(--tp-shadow-sm)',
        border: isLime || isDark ? 'none' : '1px solid var(--tp-border)',
      }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium" style={{ color: subColor }}>
          {title}
        </p>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-4xl font-semibold leading-none" style={{ color: valueColor }}>
          {value}
        </p>
        {description && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: subColor }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
