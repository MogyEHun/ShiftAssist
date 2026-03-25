'use client'

import { useTranslation } from '@/components/providers/LanguageProvider'

export function LanguageSwitcher({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { locale, setLocale } = useTranslation()
  const next = locale === 'hu' ? 'en' : 'hu'

  const darkStyle = 'border-white/20 text-white hover:bg-white/10'
  const lightStyle = 'border-gray-200 text-gray-600 hover:bg-gray-50'

  return (
    <button
      onClick={() => setLocale(next)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex-shrink-0 ${
        variant === 'dark' ? darkStyle : lightStyle
      }`}
      title={locale === 'hu' ? 'Switch to English' : 'Váltás magyarra'}
    >
      <span className="text-sm leading-none">{locale === 'hu' ? '🇬🇧' : '🇭🇺'}</span>
      <span>{locale === 'hu' ? 'EN' : 'HU'}</span>
    </button>
  )
}
