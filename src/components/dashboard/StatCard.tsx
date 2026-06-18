import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'violet'
}

const variantStyles = {
  default: 'bg-white border-gray-100',
  danger: 'bg-white border-red-100',
  warning: 'bg-white border-amber-100',
  success: 'bg-white border-green-100',
  violet: 'bg-white border-violet-100',
}

const iconBg = {
  default: 'bg-gray-50 text-gray-500',
  danger: 'bg-red-50 text-red-500',
  warning: 'bg-amber-50 text-amber-500',
  success: 'bg-green-50 text-green-600',
  violet: 'bg-violet-50 text-violet-600',
}

const valueColor = {
  default: 'text-gray-900',
  danger: 'text-red-600',
  warning: 'text-amber-600',
  success: 'text-green-600',
  violet: 'text-violet-700',
}

export function StatCard({
  title,
  value,
  icon,
  description,
  variant = 'default',
}: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-5 shadow-sm', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={cn('mt-2 text-3xl font-bold', valueColor[variant])}>{value}</p>
          {description && (
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5', iconBg[variant])}>{icon}</div>
      </div>
    </div>
  )
}
