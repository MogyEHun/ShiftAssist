'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Position } from '@/types'

export async function getPositions(): Promise<Position[]> {
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
    .from('positions')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('name')

  return data ?? []
}

export async function createPosition(
  name: string
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

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'A pozíció neve nem lehet üres' }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('positions')
    .select('id')
    .eq('company_id', profile.company_id)
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return { success: false, error: 'Ez a pozíció már létezik' }

  const { error } = await admin
    .from('positions')
    .insert({ company_id: profile.company_id, name: trimmed })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/staff')
  return { success: true }
}

export async function deletePosition(
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
  const { error } = await admin
    .from('positions')
    .delete()
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/staff')
  return { success: true }
}
