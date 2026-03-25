'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeTitle } from '@/lib/sanitize'
import type { ShiftTemplate } from '@/types'

export async function getShiftTemplates(): Promise<{ data: ShiftTemplate[]; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Nincs bejelentkezve.' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { data: [], error: 'Profil nem található.' }

  const { data, error } = await supabase
    .from('shift_templates')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('name')

  return { data: (data as ShiftTemplate[]) ?? [], error: error?.message ?? null }
}

export async function saveShiftTemplate(payload: {
  name: string
  day_of_week: number
  start_time: string
  end_time: string
  position: string | null
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve.' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod sablonok létrehozásához.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('shift_templates').insert({
    company_id: profile.company_id,
    created_by: user.id,
    name: sanitizeTitle(payload.name),
    day_of_week: payload.day_of_week,
    start_time: payload.start_time,
    end_time: payload.end_time,
    position: payload.position,
  })

  return { success: !error, error: error?.message ?? null }
}

export async function deleteShiftTemplate(templateId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve.' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('shift_templates')
    .delete()
    .eq('id', templateId)
    .eq('company_id', profile.company_id)

  return { success: !error, error: error?.message ?? null }
}
