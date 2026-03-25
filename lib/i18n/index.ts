import { cookies } from 'next/headers'
import { translations, Locale } from './translations'

export type { Locale }

export function getLocale(): Locale {
  try {
    const lang = cookies().get('app_lang')?.value
    return lang === 'en' ? 'en' : 'hu'
  } catch {
    return 'hu'
  }
}

// Path-alapú getter Server Componentekhez: getT(locale)('nav.home') → string
export function getT(locale: Locale) {
  return function t(path: string): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = path.split('.').reduce((obj: any, key) => obj?.[key], translations[locale])
    if (typeof result === 'string') return result
    // fallback to Hungarian
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback = path.split('.').reduce((obj: any, key) => obj?.[key], translations['hu'])
    return typeof fallback === 'string' ? fallback : path
  }
}
