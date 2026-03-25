'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { subMonths } from 'date-fns'

export interface EmployeeReliability {
  userId: string
  fullName: string
  position: string | null
  totalShifts: number
  onTime: number
  late: number
  noShow: number
  score: number
}

export async function getReliabilityStats(companyId: string, months = 3): Promise<EmployeeReliability[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const fromDate = subMonths(new Date(), months).toISOString()
  const now = new Date().toISOString()

  const [{ data: shifts }, { data: clockEntries }, { data: employees }] = await Promise.all([
    admin
      .from('shifts')
      .select('id, user_id, start_time')
      .eq('company_id', companyId)
      .in('status', ['published', 'confirmed', 'swappable'])
      .gte('start_time', fromDate)
      .lt('start_time', now),
    admin
      .from('clock_entries')
      .select('user_id, clock_in_at')
      .eq('company_id', companyId)
      .gte('clock_in_at', fromDate),
    admin
      .from('users')
      .select('id, full_name, position')
      .eq('company_id', companyId)
      .eq('active', true),
  ])

  if (!shifts || !employees) return []

  const entries = clockEntries ?? []
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
  const FIVE_MIN_MS = 5 * 60 * 1000

  const map = new Map<string, EmployeeReliability>()

  for (const emp of employees) {
    map.set(emp.id, {
      userId: emp.id,
      fullName: emp.full_name,
      position: emp.position ?? null,
      totalShifts: 0,
      onTime: 0,
      late: 0,
      noShow: 0,
      score: 100,
    })
  }

  for (const shift of shifts) {
    if (!shift.user_id) continue
    const stat = map.get(shift.user_id)
    if (!stat) continue

    stat.totalShifts++
    const shiftStartMs = new Date(shift.start_time).getTime()

    const match = entries.find(e =>
      e.user_id === shift.user_id &&
      Math.abs(new Date(e.clock_in_at).getTime() - shiftStartMs) <= FOUR_HOURS_MS
    )

    if (!match) {
      stat.noShow++
    } else if (new Date(match.clock_in_at).getTime() <= shiftStartMs + FIVE_MIN_MS) {
      stat.onTime++
    } else {
      stat.late++
    }
  }

  const result: EmployeeReliability[] = []
  for (const stat of Array.from(map.values())) {
    stat.score = stat.totalShifts > 0 ? Math.round((stat.onTime / stat.totalShifts) * 100) : 100
    result.push(stat)
  }

  return result.sort((a, b) => b.score - a.score)
}
