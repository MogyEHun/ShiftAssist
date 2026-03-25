'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { translations, Locale } from '@/lib/i18n/translations'
import { setLanguage } from '@/app/actions/language'

interface LanguageContextValue {
  locale: Locale
  t: (path: string) => string
  setLocale: (l: Locale) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'hu',
  t: (path) => path,
  setLocale: () => {},
})

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const t = useCallback(
    (path: string): string => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = path.split('.').reduce((obj: any, key) => obj?.[key], translations[locale])
      if (typeof result === 'string') return result
      // fallback to Hungarian
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fallback = path.split('.').reduce((obj: any, key) => obj?.[key], translations['hu'])
      return typeof fallback === 'string' ? fallback : path
    },
    [locale],
  )

  function handleSetLocale(l: Locale) {
    setLocaleState(l)
    document.cookie = `app_lang=${l}; path=/; max-age=31536000; SameSite=Lax`
    setLanguage(l) // DB sync (fire and forget)
  }

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale: handleSetLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
