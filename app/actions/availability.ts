'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyUsers } from '@/lib/data/users'
import { Availability, AvailabilityDate, AvailabilityStatus } from '@/types'
import { revalidatePath } from 'next/cache'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'

// ------------------------------------------------------------
// Saját availability lekérdezése (day_of_week alapú – legacy)
// ------------------------------------------------------------
export async function getMyAvailability(): Promise<Availability[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('availability')
    .select('*')
    .eq('user_id', user.id)
    .order('day_of_week', { ascending: true })

  return (data as Availability[]) ?? []
}

// ------------------------------------------------------------
// Saját dátum-alapú elérhetőség lekérdezése
// ------------------------------------------------------------
export async function getMyAvailabilityDates(month: string): Promise<AvailabilityDate[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const monthStart = format(startOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('availability_dates')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .order('date', { ascending: true })

  return (data as AvailabilityDate[]) ?? []
}

// ------------------------------------------------------------
// Dátum-alapú elérhetőség mentése (upsert)
// ------------------------------------------------------------
export interface AvailabilityDateInput {
  date: string
  status: AvailabilityStatus
  from_time?: string | null
  to_time?: string | null
  note?: string | null
}

export async function saveAvailabilityDate(
  input: AvailabilityDateInput
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profil nem található' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('availability_dates')
    .upsert({
      user_id: user.id,
      company_id: profile.company_id,
      date: input.date,
      status: input.status,
      from_time: input.status === 'partial' ? (input.from_time ?? null) : null,
      to_time: input.status === 'partial' ? (input.to_time ?? null) : null,
      note: input.note ?? null,
    }, { onConflict: 'user_id,date' })

  if (error) return { error: error.message }
  revalidatePath('/my/schedule')
  return { error: null }
}

// ------------------------------------------------------------
// Dátum-alapú elérhetőség törlése
// ------------------------------------------------------------
export async function deleteAvailabilityDate(
  date: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('availability_dates')
    .delete()
    .eq('user_id', user.id)
    .eq('date', date)

  if (error) return { error: error.message }
  revalidatePath('/my/schedule')
  return { error: null }
}

// ------------------------------------------------------------
// Availability mentése (day_of_week alapú – legacy)
// ------------------------------------------------------------
export interface AvailabilityInput {
  day_of_week: number
  status: AvailabilityStatus
  from_time?: string | null
  to_time?: string | null
  max_days_per_week?: number | null
  note?: string | null
}

export async function saveAvailability(
  inputs: AvailabilityInput[]
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profil nem található' }

  const admin = createAdminClient()

  await admin
    .from('availability')
    .delete()
    .eq('user_id', user.id)
    .eq('company_id', profile.company_id)

  if (inputs.length === 0) {
    revalidatePath('/dashboard/schedule')
    return { error: null }
  }

  const rows = inputs.map((input) => ({
    user_id: user.id,
    company_id: profile.company_id,
    day_of_week: input.day_of_week,
    from_time: input.status === 'partial' ? (input.from_time ?? null) : null,
    to_time: input.status === 'partial' ? (input.to_time ?? null) : null,
    max_days_per_week: input.max_days_per_week ?? null,
    note: input.status === 'unavailable' ? 'unavailable' : (input.note ?? null),
  }))

  const { error } = await admin.from('availability').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/schedule')
  return { error: null }
}

// ------------------------------------------------------------
// Összes dolgozó elérhetőségének lekérdezése (manager) – legacy
// ------------------------------------------------------------
export interface StaffAvailability {
  user_id: string
  full_name: string
  position: string | null
  availability: Availability[]
}

export async function getCompanyAvailability(): Promise<StaffAvailability[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return []
  if (!['owner', 'manager', 'admin'].includes(profile.role as string)) return []

  const employees = await getCompanyUsers(profile.company_id)
  const activeEmployees = employees.filter(e => e.role === 'employee')

  if (activeEmployees.length === 0) return []

  const admin = createAdminClient()
  const { data: availRows } = await admin
    .from('availability')
    .select('*')
    .eq('company_id', profile.company_id)

  return activeEmployees.map(emp => ({
    user_id: emp.id,
    full_name: emp.full_name ?? '',
    position: emp.position ?? null,
    availability: (availRows ?? []).filter(a => a.user_id === emp.id) as Availability[],
  }))
}

// ------------------------------------------------------------
// Összes dolgozó dátum-alapú elérhetősége (manager)
// ------------------------------------------------------------
export interface StaffAvailabilityDates {
  user_id: string
  full_name: string
  position: string | null
  dates: AvailabilityDate[]
}

export async function getCompanyAvailabilityDates(month: string): Promise<StaffAvailabilityDates[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return []
  if (!['owner', 'manager', 'admin'].includes(profile.role as string)) return []

  const employees = await getCompanyUsers(profile.company_id)
  const activeEmployees = employees.filter(e => e.role === 'employee')

  if (activeEmployees.length === 0) return []

  const monthStart = format(startOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(parseISO(month + '-01')), 'yyyy-MM-dd')

  const admin = createAdminClient()
  const { data: dateRows } = await admin
    .from('availability_dates')
    .select('*')
    .eq('company_id', profile.company_id)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  return activeEmployees.map(emp => ({
    user_id: emp.id,
    full_name: emp.full_name ?? '',
    position: emp.position ?? null,
    dates: (dateRows ?? []).filter(d => d.user_id === emp.id) as AvailabilityDate[],
  }))
}

// ------------------------------------------------------------
// Cég availability_enabled kapcsoló (manager/owner/admin)
// ------------------------------------------------------------
export async function toggleAvailabilityEnabled(
  enabled: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'Profil nem található' }
  if (!['owner', 'manager', 'admin'].includes(profile.role as string)) {
    return { error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('companies')
    .update({ availability_enabled: enabled })
    .eq('id', profile.company_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/profile')
  revalidatePath('/my/schedule')
  return { error: null }
}
