'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import { Site } from '@/types'

export interface SiteWithCount extends Site {
  employee_count: number
  manager_name: string | null
}

// ------------------------------------------------------------
// Telephelyek lekérése (dolgozók számával együtt)
// ------------------------------------------------------------
export async function getSites(): Promise<SiteWithCount[]> {
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
  const { data: sites } = await admin
    .from('sites')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('name')

  if (!sites) return []

  const { data: userCounts } = await admin
    .from('users')
    .select('site_id')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .not('site_id', 'is', null)

  const countMap: Record<string, number> = {}
  for (const u of (userCounts ?? [])) {
    if (u.site_id) countMap[u.site_id] = (countMap[u.site_id] ?? 0) + 1
  }

  // Manager nevek lookup
  const managerIds = sites.map(s => s.manager_id).filter(Boolean) as string[]
  const managerNameMap: Record<string, string> = {}
  if (managerIds.length > 0) {
    const { data: managers } = await admin
      .from('users')
      .select('id, full_name')
      .in('id', managerIds)
    for (const m of (managers ?? [])) {
      managerNameMap[m.id] = m.full_name
    }
  }

  return sites.map(s => ({
    ...s,
    employee_count: countMap[s.id] ?? 0,
    manager_name: s.manager_id ? (managerNameMap[s.manager_id] ?? null) : null,
  }))
}

// ------------------------------------------------------------
// Telephely létrehozása
// ------------------------------------------------------------
export async function createSite(
  name: string,
  address: string | null,
  managerId?: string | null
): Promise<{ success: boolean; error?: string; data?: Site }> {
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

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sites')
    .insert({ company_id: profile.company_id, name: name.trim(), address: address?.trim() || null, manager_id: managerId ?? null })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(profile.company_id, user.id, 'site.create', 'site', data.id, null, { name })
  revalidatePath('/dashboard/settings/sites')
  revalidatePath('/dashboard/staff')
  return { success: true, data }
}

// ------------------------------------------------------------
// Telephely frissítése
// ------------------------------------------------------------
export async function updateSite(
  id: string,
  name: string,
  address: string | null,
  managerId?: string | null
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

  const admin = createAdminClient()
  const updatePayload: Record<string, unknown> = { name: name.trim(), address: address?.trim() || null }
  if (managerId !== undefined) updatePayload.manager_id = managerId

  const { error } = await admin
    .from('sites')
    .update(updatePayload)
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) return { success: false, error: error.message }

  await logAudit(profile.company_id, user.id, 'site.update', 'site', id, null, { name })
  revalidatePath('/dashboard/settings/sites')
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ------------------------------------------------------------
// Telephely törlése
// ------------------------------------------------------------
export async function deleteSite(
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

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()

  // Blokkolás ha van hozzárendelt dolgozó
  const { count: memberCount } = await admin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', id)

  if (memberCount && memberCount > 0) {
    return { success: false, error: `Nem törölhető: ${memberCount} dolgozó van hozzárendelve. Először rendeld őket másik telephelyhez.` }
  }

  const { error } = await admin
    .from('sites')
    .delete()
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) return { success: false, error: error.message }

  await logAudit(profile.company_id, user.id, 'site.delete', 'site', id, null, null)
  revalidatePath('/dashboard/settings/sites')
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ------------------------------------------------------------
// Dolgozó telephely-hozzárendelése
// ------------------------------------------------------------
export async function setUserSite(
  userId: string,
  siteId: string | null
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

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ site_id: siteId })
    .eq('id', userId)
    .eq('company_id', profile.company_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/staff')
  revalidatePath('/dashboard/settings/sites')
  return { success: true }
}
