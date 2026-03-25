'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function setLanguage(lang: 'hu' | 'en') {
  cookies().set('app_lang', lang, {
    path: '/',
    maxAge: 31536000,
    sameSite: 'lax',
  })

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ language: lang }).eq('id', user.id)
    }
  } catch {
    // DB sync failure is non-critical; cookie already set
  }
}
