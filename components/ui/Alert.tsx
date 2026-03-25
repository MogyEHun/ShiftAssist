import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  variant: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

const config: Record<AlertVariant, {
  icon: React.FC<{ className?: string }>
  bg: string
  border: string
  title: string
  text: string
}> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-green-200',
    title: 'text-[#16a34a]',
    text: 'text-green-700',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    title: 'text-[#dc2626]',
    text: 'text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    title: 'text-[#d97706]',
    text: 'text-amber-700',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-700',
    text: 'text-blue-700',
  },
}

export function Alert({ variant, title, children, className = '' }: AlertProps) {
  const c = config[variant]
  const Icon = c.icon
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${c.bg} ${c.border} ${className}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${c.title}`} />
      <div className={`text-sm ${c.text}`}>
        {title && <p className={`font-semibold mb-0.5 ${c.title}`}>{title}</p>}
        {children}
      </div>
    </div>
  )
}
