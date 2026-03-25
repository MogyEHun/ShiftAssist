'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyUsers } from '@/lib/data/users'

export interface MonthlyTrend {
  month: string   // "YYYY-MM"
  label: string   // "2025 jan."
  totalHours: number
  totalCost: number
  shiftCount: number
}

export interface LeaveTypeStat {
  type: string
  label: string
  approved: number
  pending: number
  rejected: number
}

export interface LeaveStats {
  byType: LeaveTypeStat[]
  byEmployee: { fullName: string; totalDays: number; approved: number }[]
  totalApproved: number
  totalPending: number
}

const LEAVE_LABELS: Record<string, string> = {
  vacation: 'Évi szabadság',
  sick:     'Betegszabadság',
  unpaid:   'Fizetetlen',
  other:    'Egyéb',
}

export async function getMonthlyTrends(
  companyId: string,
  months = 6
): Promise<MonthlyTrend[]> {
  try {
    const admin = createAdminClient()
    const results: MonthlyTrend[] = []

    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const mon = d.getMonth() + 1
      const month = `${year}-${String(mon).padStart(2, '0')}`
      const from = `${month}-01`
      const lastDay = new Date(year, mon, 0).getDate()
      const to = `${month}-${String(lastDay).padStart(2, '0')}`

      const label = d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short' })

      const { data: shifts } = await admin
        .from('shifts')
        .select('user_id, start_time, end_time, break_minutes')
        .eq('company_id', companyId)
        .in('status', ['published', 'confirmed', 'swappable'])
        .gte('start_time', `${from}T00:00:00`)
        .lte('start_time', `${to}T23:59:59`)

      const employees = await getCompanyUsers(companyId, true)
      const empMap = new Map(employees.map(e => [e.id, e]))

      let totalHours = 0, totalCost = 0, shiftCount = 0
      for (const s of shifts ?? []) {
        if (!s.user_id) continue
        const emp = empMap.get(s.user_id)
        if (!emp) continue
        const grossMin = Math.max(0, (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)
        const netMin = Math.max(0, grossMin - (s.break_minutes ?? 0))
        const netH = Math.round(netMin / 60 * 100) / 100
        const pay = (emp.pay_type ?? 'hourly') === 'daily'
          ? (emp.daily_rate ?? 0)
          : Math.round((emp.hourly_rate ?? 0) * netH)
        totalHours += netH
        totalCost += pay
        shiftCount++
      }

      results.push({ month, label, totalHours: Math.round(totalHours * 10) / 10, totalCost, shiftCount })
    }

    return results
  } catch {
    return []
  }
}

export async function getLeaveStats(
  companyId: string,
  year: string
): Promise<LeaveStats> {
  try {
    const admin = createAdminClient()
    const employees = await getCompanyUsers(companyId, true)
    const empMap = new Map(employees.map(e => [e.id, e.full_name]))

    const { data: leaves } = await admin
      .from('leave_requests')
      .select('user_id, type, status, start_date, end_date')
      .eq('company_id', companyId)
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`)

    const typeMap = new Map<string, LeaveTypeStat>()
    const empLeaveMap = new Map<string, { totalDays: number; approved: number }>()

    for (const l of leaves ?? []) {
      const type = l.type ?? 'other'
      const status: string = l.status ?? 'pending'
      const days = Math.max(1, Math.round((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1)

      if (!typeMap.has(type)) {
        typeMap.set(type, { type, label: LEAVE_LABELS[type] ?? type, approved: 0, pending: 0, rejected: 0 })
      }
      const ts = typeMap.get(type)!
      if (status === 'approved') ts.approved += days
      else if (status === 'pending') ts.pending += days
      else if (status === 'rejected') ts.rejected += days

      if (l.user_id) {
        const prev = empLeaveMap.get(l.user_id) ?? { totalDays: 0, approved: 0 }
        prev.totalDays += days
        if (status === 'approved') prev.approved += days
        empLeaveMap.set(l.user_id, prev)
      }
    }

    const byEmployee = Array.from(empLeaveMap.entries())
      .map(([id, v]) => ({ fullName: empMap.get(id) ?? id, ...v }))
      .sort((a, b) => b.approved - a.approved)
      .slice(0, 10)

    const totalApproved = Array.from(typeMap.values()).reduce((s, t) => s + t.approved, 0)
    const totalPending  = Array.from(typeMap.values()).reduce((s, t) => s + t.pending,  0)

    return {
      byType: Array.from(typeMap.values()),
      byEmployee,
      totalApproved,
      totalPending,
    }
  } catch {
    return { byType: [], byEmployee: [], totalApproved: 0, totalPending: 0 }
  }
}

export interface EmployeeStat {
  userId: string
  fullName: string
  position: string | null
  payType: 'hourly' | 'daily'
  hourlyRate: number | null
  dailyRate: number | null
  shiftCount: number
  totalHours: number   // nettó ledolgozott óra
  totalPay: number     // bruttó bér (Ft)
}

export async function getMonthlyStats(
  month: string,
  siteId?: string,
  positionFilter?: string,
): Promise<{ stats: EmployeeStat[]; error?: string }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { stats: [], error: 'Nincs bejelentkezve' }

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
      return { stats: [], error: 'Nincs jogosultságod' }
    }

    const admin = createAdminClient()

    // month: "YYYY-MM"
    const from = `${month}-01`
    const lastDay = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate()
    const to = `${month}-${String(lastDay).padStart(2, '0')}`

    const [allEmployees, { data: shifts }] = await Promise.all([
      getCompanyUsers(profile.company_id, true),
      admin
        .from('shifts')
        .select('user_id, start_time, end_time, break_minutes, status')
        .eq('company_id', profile.company_id)
        .in('status', ['published', 'confirmed', 'swappable'])
        .gte('start_time', `${from}T00:00:00`)
        .lte('start_time', `${to}T23:59:59`),
    ])

    // Szűrés telephely és munkakör szerint
    const employees = allEmployees.filter(e => {
      if (siteId && e.site_id !== siteId) return false
      if (positionFilter && e.position !== positionFilter) return false
      return true
    })

    const empMap = new Map(employees.map(e => [e.id, e]))

    // Per-employee aggregation
    const statMap = new Map<string, EmployeeStat>()

    // Init all employees with 0 shifts
    for (const emp of employees) {
      if (!emp.is_active) continue
      statMap.set(emp.id, {
        userId: emp.id,
        fullName: emp.full_name,
        position: emp.position,
        payType: emp.pay_type ?? 'hourly',
        hourlyRate: emp.hourly_rate ?? null,
        dailyRate: emp.daily_rate ?? null,
        shiftCount: 0,
        totalHours: 0,
        totalPay: 0,
      })
    }

    for (const s of shifts ?? []) {
      if (!s.user_id) continue
      const emp = empMap.get(s.user_id)
      if (!emp) continue

      const startMs = new Date(s.start_time).getTime()
      const endMs = new Date(s.end_time).getTime()
      const grossMinutes = Math.max(0, (endMs - startMs) / 60000)
      const netMinutes = Math.max(0, grossMinutes - (s.break_minutes ?? 0))
      const netHours = Math.round(netMinutes / 60 * 100) / 100

      const payType: 'hourly' | 'daily' = emp.pay_type ?? 'hourly'
      const pay = payType === 'daily'
        ? (emp.daily_rate ?? 0)
        : Math.round((emp.hourly_rate ?? 0) * netHours)

      const existing = statMap.get(s.user_id)
      if (existing) {
        existing.shiftCount++
        existing.totalHours = Math.round((existing.totalHours + netHours) * 100) / 100
        existing.totalPay += pay
      } else {
        statMap.set(s.user_id, {
          userId: s.user_id,
          fullName: emp.full_name,
          position: emp.position,
          payType,
          hourlyRate: emp.hourly_rate ?? null,
          dailyRate: emp.daily_rate ?? null,
          shiftCount: 1,
          totalHours: netHours,
          totalPay: pay,
        })
      }
    }

    return { stats: Array.from(statMap.values()) }
  } catch (e) {
    return { stats: [], error: String(e) }
  }
}
