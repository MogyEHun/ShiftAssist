'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ShiftWithAssignee } from '@/types'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import { getUserById, getCompanyUsers } from '@/lib/data/users'

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nem vagy bejelentkezve')
  const profile = await getUserById(user.id)
  if (!profile) throw new Error('Profil nem található')
  return profile
}

// ------------------------------------------------------------
// Szabad műszakok listája
// ------------------------------------------------------------
export async function getOpenShifts(): Promise<ShiftWithAssignee[]> {
  const currentUser = await getCurrentUser()
  const supabase = await createClient()

  const { data } = await supabase
    .from('shifts')
    .select('*')
    .eq('company_id', currentUser.company_id)
    .eq('status', 'open')
    .is('user_id', null)
    .order('start_time', { ascending: true })

  return ((data ?? []) as ShiftWithAssignee[]).map(s => ({ ...s, assignee: null, swap_request: null }))
}

// ------------------------------------------------------------
// Szabad műszak létrehozása (manager/owner)
// ------------------------------------------------------------
export async function createOpenShift(payload: {
  title: string
  start_time: string
  end_time: string
  required_position: string | null
  notes: string | null
}): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser()

  if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
    return { error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('shifts').insert({
    ...payload,
    company_id: currentUser.company_id,
    created_by: currentUser.id,
    user_id: null,
    status: 'open',
    type: 'fixed',
    break_minutes: 0,
    updated_at: new Date().toISOString(),
  }).select('id').single()

  if (error) return { error: error.message }

  // Értesítés az összes aktív, megfelelő pozíciójú dolgozónak
  try {
    const allUsers = await getCompanyUsers(currentUser.company_id, true)
    const eligibleUsers = allUsers.filter(u => !['owner', 'admin', 'manager'].includes(u.role))

    if (eligibleUsers.length > 0) {
      const { sendOpenShiftNotification } = await import('./notifications')
      await sendOpenShiftNotification(data.id, eligibleUsers, payload.title, payload.start_time)
    }
  } catch {
    // Értesítési hiba nem blokkolja
  }

  await logAudit(currentUser.company_id, currentUser.id, 'open_shift.create', 'shift', data.id, null, { title: payload.title })
  revalidatePath('/dashboard/open-shifts')
  revalidatePath('/dashboard/schedule')
  return { error: null }
}

// ------------------------------------------------------------
// Elvállalom (dolgozó jelentkezik)
// ------------------------------------------------------------
export async function claimOpenShift(shiftId: string): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser()

  const admin = createAdminClient()

  // Ellenőrzés: valóban szabad-e még
  const { data: shift } = await admin
    .from('shifts')
    .select('id, status, user_id, company_id, title, required_position')
    .eq('id', shiftId)
    .eq('company_id', currentUser.company_id)
    .single()

  if (!shift) return { error: 'Műszak nem található' }
  if (shift.status !== 'open' || shift.user_id !== null) {
    return { error: 'Ez a műszak már nem szabad' }
  }

  // Automatikus hozzárendelés – első kattintóé
  const { error } = await admin.from('shifts').update({
    user_id: currentUser.id,
    status: 'published',
    updated_at: new Date().toISOString(),
  }).eq('id', shiftId)

  if (error) return { error: error.message }

  // Manager értesítés
  try {
    const allUsers = await getCompanyUsers(currentUser.company_id, true)
    const managers = allUsers.filter(u => ['owner', 'admin', 'manager'].includes(u.role))

    if (managers.length) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await Promise.allSettled(managers.map(m =>
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: m.email,
          subject: `${currentUser.full_name} elvállalta: ${shift.title}`,
          html: `<p>${currentUser.full_name} elvállalta a(z) <strong>${shift.title}</strong> szabad műszakot.</p>`,
        })
      ))
    }
  } catch {
    // Email hiba nem blokkolja
  }

  await logAudit(currentUser.company_id, currentUser.id, 'open_shift.claimed', 'shift', shiftId, null, { claimedBy: currentUser.full_name })
  revalidatePath('/dashboard/open-shifts')
  revalidatePath('/dashboard/schedule')
  return { error: null }
}

// ------------------------------------------------------------
// Szabad műszak törlése (manager/owner)
// ------------------------------------------------------------
export async function deleteOpenShift(shiftId: string): Promise<{ error: string | null }> {
  const currentUser = await getCurrentUser()

  if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
    return { error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('shifts')
    .delete()
    .eq('id', shiftId)
    .eq('company_id', currentUser.company_id)
    .eq('status', 'open')

  if (error) return { error: error.message }

  await logAudit(currentUser.company_id, currentUser.id, 'open_shift.delete', 'shift', shiftId, null, null)
  revalidatePath('/dashboard/open-shifts')
  revalidatePath('/dashboard/schedule')
  return { error: null }
}
