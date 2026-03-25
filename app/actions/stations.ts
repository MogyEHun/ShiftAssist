'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import { Station } from '@/types'

// ------------------------------------------------------------
// Állomások lekérése
// ------------------------------------------------------------
export async function getStations(): Promise<Station[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('stations')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('name')

  return data ?? []
}

// ------------------------------------------------------------
// Állomás létrehozása
// ------------------------------------------------------------
export async function createStation(
  name: string,
  color: string
): Promise<{ success: boolean; error?: string; data?: Station }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('stations')
    .insert({ company_id: profile.company_id, name: name.trim(), color })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(profile.company_id, user.id, 'station.create', 'station', data.id, null, { name })
  revalidatePath('/dashboard/settings/stations')
  revalidatePath('/dashboard/schedule')
  return { success: true, data }
}

// ------------------------------------------------------------
// Állomás frissítése
// ------------------------------------------------------------
export async function updateStation(
  id: string,
  name: string,
  color: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('stations')
    .update({ name: name.trim(), color })
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) return { success: false, error: error.message }

  await logAudit(profile.company_id, user.id, 'station.update', 'station', id, null, { name })
  revalidatePath('/dashboard/settings/stations')
  revalidatePath('/dashboard/schedule')
  return { success: true }
}

// ------------------------------------------------------------
// Állomás törlése
// ------------------------------------------------------------
export async function deleteStation(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()

  // Blokkolás ha van hozzárendelt aktív műszak
  const { count: shiftCount } = await admin
    .from('shifts')
    .select('id', { count: 'exact', head: true })
    .eq('station_id', id)

  if (shiftCount && shiftCount > 0) {
    return { success: false, error: `Nem törölhető: ${shiftCount} műszak van hozzárendelve. Először távolítsd el őket.` }
  }

  const { error } = await admin
    .from('stations')
    .delete()
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) return { success: false, error: error.message }

  await logAudit(profile.company_id, user.id, 'station.delete', 'station', id, null, null)
  revalidatePath('/dashboard/settings/stations')
  revalidatePath('/dashboard/schedule')
  return { success: true }
}
