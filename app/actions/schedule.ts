'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  WeeklyScheduleData,
  ShiftWithAssignee,
  CreateShiftPayload,
  ShiftStatus,
  AvailabilityDate,
  Site,
} from '@/types'
import { endOfWeek, endOfMonth, addDays, subWeeks, formatISO, parseISO } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { sendSwapRequestEmail, sendSwapResultEmail } from './notifications'
import { logAudit } from './audit'
import { sanitizeTitle, sanitizeNote } from '@/lib/sanitize'
import { getUserById, getCompanyUsers } from '@/lib/data/users'

// ------------------------------------------------------------
// Segédfüggvény: bejelentkezett user + company_id
// ------------------------------------------------------------
async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Nem vagy bejelentkezve')

  // Visszafejtett adatok a titkosítási rétegen keresztül
  const profile = await getUserById(user.id)
  if (!profile) throw new Error('Felhasználói profil nem található')
  return profile
}

// ------------------------------------------------------------
// Heti beosztás lekérdezése
// ------------------------------------------------------------
export async function getWeeklySchedule(weekStartISO: string, siteId?: string): Promise<WeeklyScheduleData> {
  const supabase = createClient()
  const currentUser = await getCurrentUser()

  // Hét kezdete (hétfő) és vége (vasárnap)
  const weekStart = parseISO(weekStartISO)
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekEndStr = formatISO(addDays(weekEnd, 1), { representation: 'date' }) // exkluzív

  // Párhuzamos adatlekérés
  const [
    { data: shifts, error: shiftsError },
    decryptedEmployees,
    { data: positions },
    { data: overtimeConfig },
    { data: availabilities },
    { data: approvedLeaves },
    { data: availabilityDatesRows },
    { data: stationsRows },
    { data: sitesRows },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select(`
        *,
        assignee:users!shifts_user_id_fkey(
          id, role, position, hourly_rate, avatar_url, is_active
        ),
        swap_request:shift_swap_requests!shift_swap_requests_shift_id_fkey(
          id, status, requester_id, target_user_id, message, manager_note
        )
      `)
      .eq('company_id', currentUser.company_id)
      .neq('status', 'cancelled')
      .gte('start_time', weekStartISO)
      .lt('start_time', weekEndStr)
      .order('start_time', { ascending: true }),

    // Visszafejtett dolgozó lista (full_name, email, phone dekriptálva)
    getCompanyUsers(currentUser.company_id, true),

    supabase
      .from('positions')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('name', { ascending: true }),

    supabase
      .from('overtime_config')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .single(),

    supabase
      .from('availability')
      .select('*')
      .eq('company_id', currentUser.company_id),

    // Jóváhagyott szabadságok a hétre (átfedő intervallumok)
    supabase
      .from('leave_requests')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .eq('status', 'approved')
      .lte('start_date', formatISO(weekEnd, { representation: 'date' }))
      .gte('end_date', weekStartISO),

    supabase
      .from('availability_dates')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .gte('date', weekStartISO)
      .lte('date', formatISO(weekEnd, { representation: 'date' })),

    supabase
      .from('stations')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('name'),

    supabase
      .from('sites')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('name'),
  ])

  if (shiftsError) throw new Error(`Műszakok betöltése sikertelen: ${shiftsError.message}`)

  // Visszafejtett employee map (id → DecryptedUser) a shift assignee mergeléshez
  const employeeMap = new Map(decryptedEmployees.map(e => [e.id, e]))

  // Swap request: csak az első (legutóbbi) aktív kérés számít
  // Assignee full_name és email a visszafejtett mapből
  const normalizedShifts: ShiftWithAssignee[] = (shifts || []).map((s: any) => {
    const decEmployee = s.assignee?.id ? employeeMap.get(s.assignee.id) : null
    return {
      ...s,
      assignee: s.assignee ? {
        ...s.assignee,
        full_name: decEmployee?.full_name ?? '',
        email: decEmployee?.email ?? '',
        phone: decEmployee?.phone ?? null,
        company_id: currentUser.company_id,
        created_at: decEmployee?.created_at ?? '',
        updated_at: decEmployee?.updated_at ?? '',
      } : null,
      swap_request: Array.isArray(s.swap_request) && s.swap_request.length > 0
        ? s.swap_request.find((r: any) => r.status === 'pending' || r.status === 'accepted') ?? null
        : null,
    }
  })

  // Heti munkaórák kiszámítása dolgozónként (percben)
  const weeklyHoursPerUser: Record<string, number> = {}
  for (const shift of normalizedShifts) {
    if (!shift.user_id) continue
    const start = new Date(shift.start_time).getTime()
    const end = new Date(shift.end_time).getTime()
    const minutes = Math.max(0, (end - start) / 60000 - (shift.break_minutes ?? 0))
    weeklyHoursPerUser[shift.user_id] = (weeklyHoursPerUser[shift.user_id] ?? 0) + minutes
  }

  // Multi-site mód: ha van legalább 1 telephely, aktiválódik
  const isMultiSite = (sitesRows ?? []).length > 0
  let scopedEmployees = decryptedEmployees
  if (isMultiSite) {
    if (['owner', 'admin'].includes(currentUser.role) && siteId) {
      scopedEmployees = decryptedEmployees.filter(e => e.site_id === siteId)
    } else if (currentUser.role === 'manager' && (currentUser as any).site_id) {
      scopedEmployees = decryptedEmployees.filter(e => e.site_id === (currentUser as any).site_id)
    }
  }
  const scopedEmployeeIds = new Set(scopedEmployees.map(e => e.id))

  // Employee role: draft szűrés + hourly_rate eltávolítás az assignee-ből
  const isEmployee = currentUser.role === 'employee'
  const visibleShifts = (isEmployee ? normalizedShifts.filter(s => s.status !== 'draft') : normalizedShifts)
    .filter(s => !isMultiSite || !s.user_id || scopedEmployeeIds.has(s.user_id))
    .map(s => {
      if (!isEmployee || !s.assignee) return s
      const { hourly_rate: _hr, ...assigneeWithoutRate } = s.assignee as any
      return { ...s, assignee: assigneeWithoutRate }
    })

  return {
    shifts: visibleShifts,
    employees: scopedEmployees as any,
    weekStart: weekStartISO,
    weekEnd: formatISO(weekEnd, { representation: 'date' }),
    positions: positions || [],
    weeklyHoursPerUser,
    overtimeConfig: overtimeConfig ?? null,
    availabilities: availabilities || [],
    availabilityDates: (availabilityDatesRows ?? []) as AvailabilityDate[],
    approvedLeaves: approvedLeaves || [],
    stations: stationsRows ?? [],
    sites: (sitesRows ?? []) as Site[],
    isMultiSite,
  }
}

// ------------------------------------------------------------
// Havi beosztás lekérdezése (napi + havi nézethez)
// ------------------------------------------------------------
export async function getMonthlySchedule(monthStartISO: string): Promise<{
  shifts: ShiftWithAssignee[]
  employees: { id: string; full_name: string; position: string | null }[]
  positions: { id: string; name: string; color: string | null }[]
  monthStart: string
  monthEnd: string
}> {
  const supabase = createClient()
  const currentUser = await getCurrentUser()

  const monthStart = parseISO(monthStartISO)
  const monthEnd = endOfMonth(monthStart)
  const monthEndStr = formatISO(addDays(monthEnd, 1), { representation: 'date' })

  const [{ data: shifts }, decryptedEmployees, { data: positions }] = await Promise.all([
    supabase
      .from('shifts')
      .select(`
        *,
        assignee:users!shifts_user_id_fkey(id, position)
      `)
      .eq('company_id', currentUser.company_id)
      .neq('status', 'cancelled')
      .gte('start_time', monthStartISO)
      .lt('start_time', monthEndStr)
      .order('start_time', { ascending: true }),

    // Visszafejtett lista (full_name dekriptálva)
    getCompanyUsers(currentUser.company_id, true),

    supabase
      .from('positions')
      .select('id, name, color')
      .eq('company_id', currentUser.company_id)
      .order('name', { ascending: true }),
  ])

  const employeeMap = new Map(decryptedEmployees.map(e => [e.id, e]))

  const normalizedShifts: ShiftWithAssignee[] = (shifts || []).map((s: any) => {
    const decEmployee = s.assignee?.id ? employeeMap.get(s.assignee.id) : null
    return {
      ...s,
      assignee: s.assignee ? {
        ...s.assignee,
        full_name: decEmployee?.full_name ?? '',
        email: decEmployee?.email ?? '',
      } : null,
      swap_request: null,
    }
  })

  return {
    shifts: normalizedShifts,
    employees: decryptedEmployees.map(e => ({ id: e.id, full_name: e.full_name, position: e.position })),
    positions: positions || [],
    monthStart: monthStartISO,
    monthEnd: formatISO(monthEnd, { representation: 'date' }),
  }
}

// ------------------------------------------------------------
// Segédfüggvény: ütközés + pihenőidő ellenőrzés (3.1, 3.3)
// ------------------------------------------------------------
async function checkShiftConflict(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<{ conflict: boolean; warning: string | null }> {
  if (!userId) return { conflict: false, warning: null }

  // Ütköző műszakok: start_time < newEnd AND end_time > newStart
  const { data: overlapping } = await supabase
    .from('shifts')
    .select('id, start_time, end_time')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  const conflicts = (overlapping ?? []).filter((s) => s.id !== excludeShiftId)
  if (conflicts.length > 0) {
    return { conflict: true, warning: 'Ütközés: a dolgozónak már van műszakja ebben az időpontban.' }
  }

  // 11 órás pihenőidő ellenőrzés (nem blokkoló – csak warning)
  const REST_MS = 11 * 60 * 60 * 1000
  const newStart = new Date(startTime).getTime()
  const newEnd = new Date(endTime).getTime()

  const { data: nearbyShifts } = await supabase
    .from('shifts')
    .select('id, start_time, end_time')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
    .gte('end_time', new Date(newStart - 24 * 60 * 60 * 1000).toISOString())
    .lte('start_time', new Date(newEnd + 24 * 60 * 60 * 1000).toISOString())

  for (const s of (nearbyShifts ?? []).filter((s) => s.id !== excludeShiftId)) {
    const sEnd = new Date(s.end_time).getTime()
    const sStart = new Date(s.start_time).getTime()
    if (sEnd <= newStart && newStart - sEnd < REST_MS) {
      return { conflict: false, warning: 'Figyelmeztetés: a dolgozónak nincs meg a kötelező 11 óra pihenőideje.' }
    }
    if (newEnd <= sStart && sStart - newEnd < REST_MS) {
      return { conflict: false, warning: 'Figyelmeztetés: a következő műszak előtt nincs meg a kötelező 11 óra pihenőideje.' }
    }
  }

  // Jóváhagyott szabadság ütközés ellenőrzés (blokkoló)
  const shiftDate = startTime.slice(0, 10) // YYYY-MM-DD
  const { data: approvedLeave } = await supabase
    .from('leave_requests')
    .select('id, type, start_date, end_date')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('status', 'approved')
    .lte('start_date', shiftDate)
    .gte('end_date', shiftDate)
    .limit(1)

  if (approvedLeave && approvedLeave.length > 0) {
    return { conflict: true, warning: 'Ütközés: a dolgozónak jóváhagyott szabadsága van ezen a napon.' }
  }

  return { conflict: false, warning: null }
}

// ------------------------------------------------------------
// Műszak mozgatása (drag & drop) – admin klienssel (RLS bypass)
// ------------------------------------------------------------
export async function moveShift(
  shiftId: string,
  newUserId: string | null,
  newStartTime: string,
  newEndTime: string,
  makeDraft?: boolean
): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    // Csak manager/owner/admin mozgathat
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { error: 'Nincs jogosultságod műszakot mozgatni' }
    }

    // Ütközés és pihenőidő ellenőrzés
    if (newUserId) {
      const supabase = createClient()
      const { conflict, warning } = await checkShiftConflict(
        supabase, currentUser.company_id, newUserId, newStartTime, newEndTime, shiftId
      )
      if (conflict) return { error: warning! }
      if (warning) return { error: warning } // pihenőidő warning is visszaküldve (kliens megmutatja)
    }

    const admin = createAdminClient()
    const updatePayload: Record<string, unknown> = {
      user_id: newUserId,
      start_time: newStartTime,
      end_time: newEndTime,
      updated_at: new Date().toISOString(),
    }
    if (makeDraft) updatePayload.status = 'draft'
    const { error } = await admin
      .from('shifts')
      .update(updatePayload)
      .eq('id', shiftId)
      .eq('company_id', currentUser.company_id)

    if (error) return { error: error.message }

    await logAudit(currentUser.company_id, currentUser.id, 'shift.move', 'shift', shiftId, null, { newUserId, newStartTime, newEndTime })
    // Dolgozó in-app értesítés (átmozgatva vagy újra hozzárendelve)
    if (newUserId) {
      const { data: shiftData } = await createAdminClient().from('shifts').select('title').eq('id', shiftId).single()
      await logAudit(currentUser.company_id, newUserId, 'shift_assigned', 'shift', shiftId, null, { title: shiftData?.title ?? '', start_time: newStartTime })
    }
    revalidatePath('/dashboard/schedule')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Új műszak létrehozása
// ------------------------------------------------------------
export async function createShift(
  payload: CreateShiftPayload
): Promise<{ data: ShiftWithAssignee | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { data: null, error: 'Nincs jogosultságod műszakot létrehozni' }
    }

    const sanitizedPayload: CreateShiftPayload = {
      ...payload,
      title: sanitizeTitle(payload.title),
      notes: payload.notes ? sanitizeNote(payload.notes) : null,
    }

    // Ütközés és pihenőidő ellenőrzés
    if (sanitizedPayload.user_id) {
      const supabase = createClient()
      const { conflict, warning } = await checkShiftConflict(
        supabase, currentUser.company_id, sanitizedPayload.user_id,
        sanitizedPayload.start_time, sanitizedPayload.end_time
      )
      if (conflict) return { data: null, error: warning! }
      if (warning) return { data: null, error: warning }
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('shifts')
      .insert({
        ...sanitizedPayload,
        company_id: currentUser.company_id,
        created_by: currentUser.id,
        break_minutes: 0,
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        assignee:users!shifts_user_id_fkey(
          id, role, position, hourly_rate, avatar_url, is_active
        )
      `)
      .single()

    if (error) return { data: null, error: error.message }

    // Assignee decrypted nevének bővítése
    let assigneeWithName = data.assignee || null
    if (assigneeWithName?.id) {
      const decUser = await getUserById(assigneeWithName.id)
      if (decUser) assigneeWithName = { ...assigneeWithName, full_name: decUser.full_name, email: decUser.email }
    }

    await logAudit(currentUser.company_id, currentUser.id, 'shift.create', 'shift', data.id, null, { title: data.title, start_time: data.start_time })
    // Dolgozó in-app értesítés
    if (data.user_id) {
      await logAudit(currentUser.company_id, data.user_id, 'shift_assigned', 'shift', data.id, null, { title: data.title, start_time: data.start_time })
    }
    revalidatePath('/dashboard/schedule')
    return {
      data: { ...data, assignee: assigneeWithName, swap_request: null },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Műszak frissítése
// ------------------------------------------------------------
export async function updateShift(
  shiftId: string,
  payload: Partial<CreateShiftPayload>
): Promise<{ data: ShiftWithAssignee | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { data: null, error: 'Nincs jogosultságod műszakot szerkeszteni' }
    }

    const sanitizedUpdate = {
      ...payload,
      ...(payload.title !== undefined && { title: sanitizeTitle(payload.title) }),
      ...(payload.notes !== undefined && { notes: payload.notes ? sanitizeNote(payload.notes) : null }),
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('shifts')
      .update({ ...sanitizedUpdate, updated_at: new Date().toISOString() })
      .eq('id', shiftId)
      .eq('company_id', currentUser.company_id)
      .select(`
        *,
        assignee:users!shifts_user_id_fkey(
          id, role, position, hourly_rate, avatar_url, is_active
        )
      `)
      .single()

    if (error) return { data: null, error: error.message }

    // Assignee decrypted nevének bővítése
    let assigneeWithName = data.assignee || null
    if (assigneeWithName?.id) {
      const decUser = await getUserById(assigneeWithName.id)
      if (decUser) assigneeWithName = { ...assigneeWithName, full_name: decUser.full_name, email: decUser.email }
    }

    await logAudit(currentUser.company_id, currentUser.id, 'shift.update', 'shift', data.id, null, { title: data.title, start_time: data.start_time })
    // Dolgozó in-app értesítés
    if (data.user_id) {
      await logAudit(currentUser.company_id, data.user_id, 'shift_updated', 'shift', data.id, null, { title: data.title, start_time: data.start_time })
    }
    revalidatePath('/dashboard/schedule')
    return {
      data: { ...data, assignee: assigneeWithName, swap_request: null },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Műszak törlése
// ------------------------------------------------------------
export async function deleteShift(shiftId: string): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { error: 'Nincs jogosultságod műszakot törölni' }
    }

    const admin = createAdminClient()

    // Mentjük a régi adatot a visszavonáshoz
    const { data: oldShift } = await admin
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single()

    const { error } = await admin
      .from('shifts')
      .delete()
      .eq('id', shiftId)
      .eq('company_id', currentUser.company_id)

    if (error) return { error: error.message }

    // Dolgozó in-app értesítés
    if (oldShift?.user_id) {
      await logAudit(currentUser.company_id, oldShift.user_id, 'shift_cancelled', 'shift', shiftId, null, { title: oldShift.title, start_time: oldShift.start_time })
    }
    await logAudit(currentUser.company_id, currentUser.id, 'shift.delete', 'shift', shiftId, oldShift ?? null, null)
    revalidatePath('/dashboard/schedule')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Csere kérése (dolgozó)
// ------------------------------------------------------------
export async function requestSwap(shiftId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const currentUser = await getCurrentUser()

    // Ellenőrzés: saját műszak
    const { data: shift } = await supabase
      .from('shifts')
      .select('id, user_id, status')
      .eq('id', shiftId)
      .eq('user_id', currentUser.id)
      .single()

    if (!shift) return { error: 'Ez nem a te műszakod' }
    if (shift.status === 'swappable') return { error: 'Ez a műszak már cserélhető' }

    const admin = createAdminClient()

    // Műszak státusz frissítése
    await admin
      .from('shifts')
      .update({ status: 'swappable' as ShiftStatus, updated_at: new Date().toISOString() })
      .eq('id', shiftId)

    // Csereigény létrehozása
    const { error: swapError } = await admin
      .from('shift_swap_requests')
      .insert({
        company_id: currentUser.company_id,
        requester_id: currentUser.id,
        shift_id: shiftId,
        status: 'pending',
      })

    if (swapError) return { error: swapError.message }

    revalidatePath('/dashboard/schedule')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Csere elfogadása (másik dolgozó)
// ------------------------------------------------------------
export async function acceptSwap(swapRequestId: string): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()

    // Csereigény lekérése
    const { data: swapReq } = await admin
      .from('shift_swap_requests')
      .select('*, shift:shifts(*), requester:users!shift_swap_requests_requester_id_fkey(*)')
      .eq('id', swapRequestId)
      .eq('company_id', currentUser.company_id)
      .eq('status', 'pending')
      .single()

    if (!swapReq) return { error: 'Csereigény nem található' }
    if (swapReq.requester_id === currentUser.id) return { error: 'Saját csereigényt nem lehet elfogadni' }

    // Csereigény frissítése
    const { error } = await admin
      .from('shift_swap_requests')
      .update({
        target_user_id: currentUser.id,
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', swapRequestId)

    if (error) return { error: error.message }

    // Manager értesítése emailben
    try {
      // Manager/owner keresése (visszafejtett adatokkal)
      const allUsers = await getCompanyUsers(currentUser.company_id, true)
      const managers = allUsers.filter(u => ['owner', 'admin', 'manager'].includes(u.role))

      if (managers.length > 0) {
        await sendSwapRequestEmail(managers[0], swapReq, currentUser)
      }
    } catch {
      // Email hiba nem blokkolja a folyamatot
    }

    revalidatePath('/dashboard/schedule')
    revalidatePath('/dashboard/swap-requests')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Csere jóváhagyása/elutasítása (manager)
// ------------------------------------------------------------
export async function resolveSwap(
  swapRequestId: string,
  approved: boolean,
  managerNote?: string
): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { error: 'Nincs jogosultságod cserét jóváhagyni' }
    }

    const admin = createAdminClient()

    // Csereigény lekérése
    const { data: swapReq } = await admin
      .from('shift_swap_requests')
      .select('*, shift:shifts(*)')
      .eq('id', swapRequestId)
      .eq('company_id', currentUser.company_id)
      .eq('status', 'accepted')
      .single()

    if (!swapReq) return { error: 'Csereigény nem található' }
    if (!swapReq.target_user_id) return { error: 'Nincs elfogadó dolgozó' }

    if (approved) {
      // Jóváhagyás: shift.user_id átírása + státusz visszaállítása
      await admin
        .from('shifts')
        .update({
          user_id: swapReq.target_user_id,
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', swapReq.shift_id)

      await admin
        .from('shift_swap_requests')
        .update({
          status: 'approved',
          manager_note: managerNote || null,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', swapRequestId)
    } else {
      // Elutasítás: shift státusz visszaállítása
      await admin
        .from('shifts')
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', swapReq.shift_id)

      await admin
        .from('shift_swap_requests')
        .update({
          status: 'rejected',
          manager_note: managerNote || null,
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', swapRequestId)
    }

    // Email értesítés mindkét félnek
    try {
      const [requester, target] = await Promise.all([
        getUserById(swapReq.requester_id),
        getUserById(swapReq.target_user_id),
      ])

      const shiftTitle = swapReq.shift?.title || 'Műszak'

      if (requester) {
        await sendSwapResultEmail(requester, approved, shiftTitle)
      }
      if (target) {
        await sendSwapResultEmail(target, approved, shiftTitle)
      }
    } catch {
      // Email hiba nem blokkolja
    }

    await logAudit(currentUser.company_id, currentUser.id, 'swap.resolved', 'shift_swap_request', swapRequestId, null, { approved, managerNote })
    revalidatePath('/dashboard/schedule')
    revalidatePath('/dashboard/swap-requests')
    return { error: null }
  } catch (e: any) {
    return { error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Elérhető cserék listája (aktív 'pending' csereigények)
// ------------------------------------------------------------
export async function getAvailableSwaps() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  const { data, error } = await supabase
    .from('shift_swap_requests')
    .select(`
      *,
      shift:shifts(*),
      requester:users!shift_swap_requests_requester_id_fkey(id, position)
    `)
    .eq('company_id', currentUser.company_id)
    .eq('status', 'pending')
    .neq('requester_id', currentUser.id)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

// ------------------------------------------------------------
// Menedzser: elfogadott csereigények (jóváhagyásra várnak)
// ------------------------------------------------------------
export async function getPendingSwapApprovals() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()

  if (!['owner', 'admin', 'manager'].includes(currentUser.role)) return []

  const { data, error } = await supabase
    .from('shift_swap_requests')
    .select(`
      *,
      shift:shifts(*),
      requester:users!shift_swap_requests_requester_id_fkey(id, position),
      target_user:users!shift_swap_requests_target_user_id_fkey(id, position)
    `)
    .eq('company_id', currentUser.company_id)
    .eq('status', 'accepted')
    .order('updated_at', { ascending: false })

  if (error) return []
  return data || []
}

// ------------------------------------------------------------
// Műszakok közzététele (draft → published)
// ------------------------------------------------------------
export async function publishShifts(
  shiftIds: string[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const currentUser = await getCurrentUser()

    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { success: false, error: 'Nincs jogosultságod' }
    }

    if (shiftIds.length === 0) return { success: true, count: 0 }

    const admin = createAdminClient()

    const { data: updatedShifts, error: updateError } = await admin
      .from('shifts')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('company_id', currentUser.company_id)
      .eq('status', 'draft')
      .in('id', shiftIds)
      .select('id, user_id')

    if (updateError) return { success: false, error: updateError.message }

    await logAudit(
      currentUser.company_id,
      currentUser.id,
      'shifts.publish',
      'shift',
      null,
      null,
      { count: updatedShifts?.length ?? 0, shift_ids: shiftIds }
    )

    // Dolgozók in-app értesítése: mindenki akinek van publikált műszakja
    if (updatedShifts && updatedShifts.length > 0) {
      const admin = createAdminClient()
      // Shift adatok (title, start_time) lekérése az értesítéshez
      const { data: shiftDetails } = await admin
        .from('shifts')
        .select('id, user_id, title, start_time')
        .in('id', updatedShifts.map(s => s.id))
      const uniqueUserIds = Array.from(new Set((updatedShifts).map(s => s.user_id).filter(Boolean)))
      await Promise.all(uniqueUserIds.map(async (userId) => {
        const userShifts = (shiftDetails ?? []).filter(s => s.user_id === userId)
        const firstShift = userShifts[0]
        await logAudit(
          currentUser.company_id, userId!, 'shift_published', 'shift', firstShift?.id ?? null,
          null, { count: userShifts.length, title: firstShift?.title ?? '', start_time: firstShift?.start_time ?? '' }
        )
      }))
    }

    revalidatePath('/dashboard/schedule')
    return { success: true, count: updatedShifts?.length ?? 0 }
  } catch (e: any) {
    return { success: false, error: e.message || 'Ismeretlen hiba' }
  }
}

// ------------------------------------------------------------
// Hét másolása – előző hét műszakait másolja draft státuszban
// ------------------------------------------------------------
export async function copyWeekShifts(
  sourceWeekISO: string,
  targetWeekISO: string,
): Promise<{ count: number; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return { count: 0, error: 'Nincs jogosultságod ehhez a művelethez.' }
    }

    const admin = createAdminClient()

    const sourceStart = parseISO(sourceWeekISO)
    const sourceEnd = addDays(sourceStart, 7)
    const targetStart = parseISO(targetWeekISO)
    const offsetMs = targetStart.getTime() - sourceStart.getTime()

    const { data: sourceShifts, error } = await admin
      .from('shifts')
      .select('user_id, title, type, location, station_id, notes, required_position, break_minutes, company_id, start_time, end_time')
      .eq('company_id', currentUser.company_id)
      .neq('status', 'cancelled')
      .gte('start_time', sourceStart.toISOString())
      .lt('start_time', sourceEnd.toISOString())

    if (error) return { count: 0, error: error.message }
    if (!sourceShifts || sourceShifts.length === 0) return { count: 0 }

    const newShifts = sourceShifts.map(s => ({
      user_id: s.user_id,
      title: s.title,
      type: s.type,
      location: s.location,
      station_id: s.station_id,
      notes: s.notes,
      required_position: s.required_position,
      break_minutes: s.break_minutes,
      company_id: s.company_id,
      start_time: new Date(new Date(s.start_time).getTime() + offsetMs).toISOString(),
      end_time: new Date(new Date(s.end_time).getTime() + offsetMs).toISOString(),
      status: 'draft' as const,
      created_by: currentUser.id,
    }))

    // Meglévő műszakok a célhéten – ütközőket kiszűrjük
    const { data: existing } = await admin
      .from('shifts')
      .select('user_id, start_time, end_time')
      .eq('company_id', currentUser.company_id)
      .neq('status', 'cancelled')
      .gte('start_time', targetStart.toISOString())
      .lt('start_time', addDays(targetStart, 7).toISOString())

    const safeShifts = newShifts.filter(n =>
      !(existing ?? []).some(e =>
        e.user_id === n.user_id &&
        new Date(e.start_time) < new Date(n.end_time) &&
        new Date(e.end_time) > new Date(n.start_time)
      )
    )
    if (safeShifts.length === 0) return { count: 0 }

    const { error: insertError } = await admin.from('shifts').insert(safeShifts)
    if (insertError) return { count: 0, error: insertError.message }

    revalidatePath('/dashboard/schedule')
    return { count: newShifts.length }
  } catch (e: any) {
    return { count: 0, error: e.message || 'Ismeretlen hiba' }
  }
}
