import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#1a1a1a]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-lg border px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder-gray-400
          outline-none transition-colors bg-white
          focus:border-[#1a5c3a] focus:ring-2 focus:ring-[#1a5c3a]/20
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-gray-300 hover:border-gray-400'}
          ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
    </div>
  )
}
