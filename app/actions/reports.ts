'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyUsers } from '@/lib/data/users'
import { format } from 'date-fns'

export interface LeaveRow {
  userId: string
  fullName: string
  date: string
  leaveType: string
}

export interface AttendanceRow {
  userId: string
  fullName: string
  position: string | null
  payType: 'hourly' | 'daily'
  hourlyRate: number | null
  dailyRate: number | null
  date: string
  startTime: string
  endTime: string
  breakMinutes: number
  netHours: number
  pay: number
  status: string
  notes: string | null
  actualStart?: string   // Tényleges bejelentkezési idő (clock_entries)
  actualEnd?: string     // Tényleges kijelentkezési idő (clock_entries)
}

export interface AttendanceSummary {
  userId: string
  fullName: string
  position: string | null
  payType: 'hourly' | 'daily'
  totalNetHours: number
  totalPay: number
  shiftCount: number
}

export interface AttendanceData {
  companyName: string
  from: string
  to: string
  rows: AttendanceRow[]
  summaries: AttendanceSummary[]
  leaves: LeaveRow[]
}

export async function getAttendanceData(
  from: string,  // YYYY-MM-DD
  to: string     // YYYY-MM-DD
): Promise<{ data?: AttendanceData; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, companies(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return { error: 'Nincs jogosultságod' }
  }

  const companyName = (profile.companies as any)?.name ?? 'Cég'

  const admin = createAdminClient()

  const [employees, { data: shifts }, { data: leaveData }, { data: clockData }] = await Promise.all([
    getCompanyUsers(profile.company_id, true),
    admin
      .from('shifts')
      .select('id, user_id, start_time, end_time, break_minutes, status, notes')
      .eq('company_id', profile.company_id)
      .in('status', ['published', 'confirmed', 'swappable'])
      .gte('start_time', `${from}T00:00:00`)
      .lte('start_time', `${to}T23:59:59`)
      .order('start_time'),
    admin
      .from('leave_requests')
      .select('user_id, type, start_date, end_date')
      .eq('company_id', profile.company_id)
      .eq('status', 'approved')
      .lte('start_date', to)
      .gte('end_date', from),
    admin
      .from('clock_entries')
      .select('user_id, clock_in_at, clock_out_at')
      .eq('company_id', profile.company_id)
      .gte('clock_in_at', `${from}T00:00:00`)
      .lte('clock_in_at', `${to}T23:59:59`),
  ])

  // user_id + date → clock entry lookup
  const clockMap = new Map<string, { in: string; out: string | null }>()
  for (const c of clockData ?? []) {
    const date = c.clock_in_at.slice(0, 10)
    const key = `${c.user_id}:${date}`
    if (!clockMap.has(key)) {
      clockMap.set(key, { in: c.clock_in_at, out: c.clock_out_at })
    }
  }

  const empMap = new Map(employees.map(e => [e.id, e]))

  // Elfogadott szabadságok napokra bontva
  const leaves: LeaveRow[] = []
  for (const leave of leaveData ?? []) {
    if (!leave.user_id) continue
    const emp = empMap.get(leave.user_id)
    if (!emp) continue
    const start = new Date(leave.start_date)
    const end = new Date(leave.end_date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      if (dateStr >= from && dateStr <= to) {
        leaves.push({ userId: leave.user_id, fullName: emp.full_name, date: dateStr, leaveType: leave.type })
      }
    }
  }

  const rows: AttendanceRow[] = []

  for (const s of shifts ?? []) {
    if (!s.user_id) continue
    const emp = empMap.get(s.user_id)
    if (!emp) continue

    const startMs = new Date(s.start_time).getTime()
    const endMs = new Date(s.end_time).getTime()
    const grossMinutes = Math.max(0, (endMs - startMs) / 60000)
    const netMinutes = Math.max(0, grossMinutes - (s.break_minutes ?? 0))
    const netHours = Math.round(netMinutes / 60 * 100) / 100

    const payType: 'hourly' | 'daily' = (emp as any).pay_type ?? 'hourly'
    const hourlyRate: number | null = emp.hourly_rate ?? null
    const dailyRate: number | null = (emp as any).daily_rate ?? null

    const pay = payType === 'daily'
      ? (dailyRate ?? 0)
      : Math.round((hourlyRate ?? 0) * netHours)

    const date = s.start_time.slice(0, 10)
    const clock = clockMap.get(`${s.user_id}:${date}`)

    rows.push({
      userId: s.user_id,
      fullName: emp.full_name,
      position: emp.position,
      payType,
      hourlyRate,
      dailyRate,
      date,
      startTime: format(new Date(s.start_time), 'HH:mm'),
      endTime: format(new Date(s.end_time), 'HH:mm'),
      breakMinutes: s.break_minutes ?? 0,
      netHours,
      pay,
      status: s.status,
      notes: s.notes,
      actualStart: clock ? format(new Date(clock.in), 'HH:mm') : undefined,
      actualEnd: clock?.out ? format(new Date(clock.out), 'HH:mm') : undefined,
    })
  }

  // Összesítők
  const summaryMap = new Map<string, AttendanceSummary>()
  for (const r of rows) {
    const existing = summaryMap.get(r.userId)
    if (existing) {
      existing.totalNetHours = Math.round((existing.totalNetHours + r.netHours) * 100) / 100
      existing.totalPay += r.pay
      existing.shiftCount++
    } else {
      summaryMap.set(r.userId, {
        userId: r.userId,
        fullName: r.fullName,
        position: r.position,
        payType: r.payType,
        totalNetHours: r.netHours,
        totalPay: r.pay,
        shiftCount: 1,
      })
    }
  }

  return {
    data: {
      companyName,
      from,
      to,
      rows,
      summaries: Array.from(summaryMap.values()),
      leaves,
    }
  }
}
