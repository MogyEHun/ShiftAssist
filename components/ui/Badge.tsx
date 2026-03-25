type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-[#16a34a]',
  error: 'bg-red-100 text-[#dc2626]',
  warning: 'bg-amber-100 text-[#d97706]',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-[#f0f7f3] text-[#1a5c3a]',
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
