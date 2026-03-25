import { HTMLAttributes } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean
}

export function Card({ children, padding = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-lg font-semibold text-[#1a1a1a] ${className}`}>
      {children}
    </h2>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: { value: string; positive: boolean }
}

export function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#e8f5ee] flex-shrink-0">
          <span className="text-[#1a5c3a]">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-500'}`}>
              {trend.positive
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />
              }
              {trend.value}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
