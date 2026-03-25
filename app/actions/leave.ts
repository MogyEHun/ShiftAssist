'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeaveType, LeaveStatus, LeaveRequest } from '@/types'
import { revalidatePath } from 'next/cache'
import { sendLeaveRequestEmail, sendLeaveResultEmail } from './notifications'
import { logAudit } from './audit'
import { getUserById, getCompanyUsers } from '@/lib/data/users'


// ------------------------------------------------------------
// Segédfüggvény: bejelentkezett user + company_id
// ------------------------------------------------------------
async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Nem vagy bejelentkezve')

  const profile = await getUserById(user.id)
  if (!profile) throw new Error('Felhasználói profil nem található')
  return profile
}

// ------------------------------------------------------------
// Szabadságkérelmek lekérdezése
// ------------------------------------------------------------
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const currentUser = await getCurrentUser()
  const isManager = ['owner', 'admin', 'manager'].includes(currentUser.role)

  // Admin kliens: megkerüli az RLS-t, különben a manager sem látja más kérelmeit
  const admin = createAdminClient()
  let query = admin
    .from('leave_requests')
    .select('*')
    .eq('company_id', currentUser.company_id)
    .order('created_at', { ascending: false })

  if (!isManager) {
    query = query.eq('user_id', currentUser.id)
  }

  const { data, error } = await query
  if (error) throw new Error(`Lekérdezés sikertelen: ${error.message}`)

  // User adatok az admin kliensből (bypasses RLS, visszafejtve)
  let userMap: Record<string, { id: string; full_name: string; email: string; position: string | null; avatar_url: string | null }> = {}
  if (isManager) {
    const companyUsers = await getCompanyUsers(currentUser.company_id)
    userMap = Object.fromEntries(companyUsers.map(u => [u.id, {
      id: u.id, full_name: u.full_name, email: u.email,
      position: u.position, avatar_url: u.avatar_url,
    }]))
    // Manager csak a saját telephelyének dolgozóit látja
    if (currentUser.role === 'manager' && currentUser.site_id) {
      const allowedIds = new Set(companyUsers.filter(u => u.site_id === currentUser.site_id).map(u => u.id))
      return ((data || []) as any[])
        .filter(req => allowedIds.has(req.user_id))
        .map(req => ({ ...req, user: userMap[req.user_id] ?? undefined })) as LeaveRequest[]
    }
  } else {
    userMap[currentUser.id] = {
      id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email,
      position: currentUser.position, avatar_url: currentUser.avatar_url,
    }
  }

  return (data || []).map((req: any) => ({
    ...req,
    user: userMap[req.user_id] ?? undefined,
  })) as LeaveRequest[]
}

// ------------------------------------------------------------
// Új szabadságkérelem beadása
// ------------------------------------------------------------
export async function createLeaveRequest(payload: {
  type: LeaveType
  start_date: string
  end_date: string
  reason: string | null
}): Promise<{ data: LeaveRequest | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    // Validáció
    if (new Date(payload.end_date) < new Date(payload.start_date)) {
      return { data: null, error: 'A befejező dátum nem lehet a kezdő előtt' }
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('leave_requests')
      .insert({
        ...payload,
        company_id: currentUser.company_id,
        user_id: currentUser.id,
        status: 'pending' as LeaveStatus,
      })
      .select(`*, user:users!leave_requests_user_id_fkey(id, position)`)
      .single()

    if (error) return { data: null, error: error.message }

    // Manager értesítése emailben (visszafejtett adatokkal)
    try {
      const allUsers = await getCompanyUsers(currentUser.company_id, true)
      const managers = allUsers.filter(u => ['owner', 'admin', 'manager'].includes(u.role))
      if (managers.length > 0) {
        await sendLeaveRequestEmail(managers[0], payload, { full_name: currentUser.full_name })
      }
    } catch {
      // Email hiba nem blokkolja a kérelmet
    }

    await logAudit(currentUser.company_id, currentUser.id, 'leave.create', 'leave_request', data.id, null, {
      type: payload.type,
      start_date: payload.start_date,
      end_date: payload.end_date,
    })

    revalidatePath('/dashboard/leave')
    revalidatePath('/dashboard')
    return { data: data as LeaveRequest, error: null }
  } catch (e: any) {
    return { data: null, error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Szabadságkérelem jóváhagyása / elutasítása (manager)
// ------------------------------------------------------------
export async function resolveLeaveRequest(
  id: string,
  approved: boolean,
  managerNote?: string
): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { error: 'Nincs jogosultságod a kérelem kezeléséhez' }
    }

    const admin = createAdminClient()

    // Kérelem lekérése
    const { data: leaveReq } = await admin
      .from('leave_requests')
      .select('*, user_id')
      .eq('id', id)
      .eq('company_id', currentUser.company_id)
      .single()

    if (!leaveReq) return { error: 'Kérelem nem található' }

    const { error } = await admin
      .from('leave_requests')
      .update({
        status: approved ? 'approved' : 'rejected' as LeaveStatus,
        manager_note: managerNote || null,
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { error: error.message }

    // Dolgozó értesítése (visszafejtett adatokkal)
    try {
      const employee = await getUserById(leaveReq.user_id)
      if (employee) {
        await sendLeaveResultEmail(
          employee,
          approved,
          { ...leaveReq, manager_note: managerNote || null }
        )
      }
    } catch {
      // Email hiba nem blokkolja
    }

    await logAudit(currentUser.company_id, currentUser.id, 'leave.resolved', 'leave_request', id, null, { approved, managerNote })
    revalidatePath('/dashboard/leave')
    revalidatePath('/dashboard')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Beosztás integráció: van-e elfogadott szabadság az adott napon?
// ------------------------------------------------------------
export async function checkLeaveConflict(
  userId: string,
  dateISO: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const currentUser = await getCurrentUser()

    const { data } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('company_id', currentUser.company_id)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .lte('start_date', dateISO)
      .gte('end_date', dateISO)
      .limit(1)

    return (data?.length ?? 0) > 0
  } catch {
    return false
  }
}
