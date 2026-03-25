'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export type OvertimeEntityType = 'user' | 'site' | 'station'

export interface OvertimeOverride {
  id: string
  entity_type: OvertimeEntityType
  entity_id: string
  weekly_hour_warning: number
  weekly_hour_max: number
}

// ------------------------------------------------------------
// Túlóra konfiguráció frissítése
// ------------------------------------------------------------
export async function updateOvertimeConfig(
  warningHours: number,
  maxHours: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod' }
  }

  if (warningHours <= 0 || maxHours <= 0 || warningHours >= maxHours) {
    return { success: false, error: 'Érvénytelen értékek: a figyelmeztetési limit kisebb kell legyen a maximumnál' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('overtime_config')
    .upsert(
      {
        company_id: profile.company_id,
        weekly_hour_warning: warningHours,
        weekly_hour_max: maxHours,
      },
      { onConflict: 'company_id' }
    )

  if (error) return { success: false, error: error.message }

  await logAudit(
    profile.company_id,
    user.id,
    'overtime_config.update',
    'overtime_config',
    null,
    null,
    { weekly_hour_warning: warningHours, weekly_hour_max: maxHours }
  )

  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard/settings/overtime')
  return { success: true }
}

// ------------------------------------------------------------
// Túlóra konfiguráció lekérése
// ------------------------------------------------------------
export async function getOvertimeConfig(): Promise<{
  weekly_hour_warning: number
  weekly_hour_max: number
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data } = await supabase
    .from('overtime_config')
    .select('weekly_hour_warning, weekly_hour_max')
    .eq('company_id', profile.company_id)
    .single()

  return data ?? { weekly_hour_warning: 40, weekly_hour_max: 48 }
}

// ------------------------------------------------------------
// Túlóra override-ok lekérése
// ------------------------------------------------------------
export async function getOvertimeOverrides(): Promise<OvertimeOverride[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
  if (!profile || !['owner', 'admin'].includes(profile.role)) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('overtime_overrides')
    .select('id, entity_type, entity_id, weekly_hour_warning, weekly_hour_max')
    .eq('company_id', profile.company_id)
    .order('entity_type')
  return (data ?? []) as OvertimeOverride[]
}

// ------------------------------------------------------------
// Túlóra override létrehozása / frissítése
// ------------------------------------------------------------
export async function upsertOvertimeOverride(
  entityType: OvertimeEntityType,
  entityId: string,
  warningHours: number,
  maxHours: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }
  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
  if (!profile || !['owner', 'admin'].includes(profile.role)) return { success: false, error: 'Nincs jogosultságod' }
  if (warningHours <= 0 || maxHours <= warningHours) return { success: false, error: 'A maximum magasabb kell legyen a figyelmeztetésnél' }
  const admin = createAdminClient()
  const { error } = await admin.from('overtime_overrides').upsert(
    { company_id: profile.company_id, entity_type: entityType, entity_id: entityId, weekly_hour_warning: warningHours, weekly_hour_max: maxHours },
    { onConflict: 'company_id,entity_type,entity_id' }
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/settings/overtime')
  return { success: true }
}

// ------------------------------------------------------------
// Túlóra override törlése
// ------------------------------------------------------------
export async function deleteOvertimeOverride(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }
  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
  if (!profile || !['owner', 'admin'].includes(profile.role)) return { success: false, error: 'Nincs jogosultságod' }
  const admin = createAdminClient()
  const { error } = await admin.from('overtime_overrides').delete().eq('id', id).eq('company_id', profile.company_id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/settings/overtime')
  return { success: true }
}
