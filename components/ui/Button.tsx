'use client'

import { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function Button({
  children,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-[#1a5c3a] text-white hover:bg-[#155033] focus:ring-[#1a5c3a]',
    secondary: 'bg-white border border-[#1a5c3a] text-[#1a5c3a] hover:bg-[#e8f5ee] focus:ring-[#1a5c3a]',
    ghost:     'bg-transparent text-gray-500 hover:bg-[#f4f5f7] focus:ring-gray-300',
    danger:    'bg-white border border-[#dc2626] text-[#dc2626] hover:bg-[#fee2e2] focus:ring-red-500',
    gold:      'bg-[#d4a017] text-white hover:bg-[#b8890f] focus:ring-[#d4a017]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}
