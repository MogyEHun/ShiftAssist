'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_POSITIONS = ['Pincér', 'Pultos', 'Séf', 'Hostess', 'Vezető']

// Onboarding befejezése: cég adatok + pozíciók mentése
export async function completeOnboarding(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezett felhasználó.' }

  const companyName = formData.get('companyName') as string
  const companyType = formData.get('companyType') as string
  const companySize = formData.get('companySize') as string
  const subscriptionPlan = formData.get('subscriptionPlan') as string
  const positionsRaw = formData.get('positions') as string

  if (!companyName || !companyType || !companySize) {
    return { error: 'Kérjük töltsd ki az összes kötelező mezőt.' }
  }

  // Pozíciók JSON listából
  let positions: string[] = DEFAULT_POSITIONS
  try {
    const parsed = JSON.parse(positionsRaw)
    if (Array.isArray(parsed) && parsed.length > 0) positions = parsed
  } catch {}

  // Felhasználó company_id lekérése
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) return { error: 'Cég nem található.' }

  const companyId = userData.company_id

  // Cég adatok frissítése
  const { error: companyError } = await supabase
    .from('companies')
    .update({
      name: companyName,
      type: companyType,
      size: companySize,
      subscription_plan: subscriptionPlan || 'basic',
      onboarding_completed: true,
    })
    .eq('id', companyId)

  if (companyError) return { error: 'Hiba a cég adatok mentésekor.' }

  // Pozíciók mentése (előbb töröljük a meglévőket)
  await supabase.from('positions').delete().eq('company_id', companyId)

  const positionRows = positions
    .filter((p) => p.trim().length > 0)
    .map((name) => ({ company_id: companyId, name: name.trim() }))

  if (positionRows.length > 0) {
    const { error: posError } = await supabase.from('positions').insert(positionRows)
    if (posError) return { error: 'Hiba a pozíciók mentésekor.' }
  }

  redirect('/dashboard')
}
