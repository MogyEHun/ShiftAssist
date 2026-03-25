import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format, parseISO, endOfWeek, addDays } from 'date-fns'
import { hu } from 'date-fns/locale'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Nincs jogosultságod' }, { status: 403 })
  }

  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) return NextResponse.json({ error: 'Hiányzó weekStart' }, { status: 400 })

  const weekStartDate = parseISO(weekStart)
  const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 })
  const weekEndStr = format(addDays(weekEndDate, 1), 'yyyy-MM-dd')

  const admin = createAdminClient()
  const { data: shifts } = await admin
    .from('shifts')
    .select(`
      id, title, start_time, end_time, break_minutes,
      user:users!shifts_user_id_fkey(id, full_name, position, hourly_rate)
    `)
    .eq('company_id', profile.company_id)
    .neq('status', 'cancelled')
    .gte('start_time', weekStart)
    .lt('start_time', weekEndStr)
    .not('user_id', 'is', null)
    .order('start_time', { ascending: true })

  if (!shifts) return NextResponse.json({ error: 'Nincs adat' }, { status: 500 })

  // Összesítés dolgozónként
  const employeeMap: Record<string, {
    name: string
    position: string
    hourlyRate: number
    totalMinutes: number
    shiftCount: number
  }> = {}

  for (const shift of shifts as any[]) {
    if (!shift.user) continue
    const userId = shift.user.id
    if (!employeeMap[userId]) {
      employeeMap[userId] = {
        name: shift.user.full_name,
        position: shift.user.position ?? '',
        hourlyRate: shift.user.hourly_rate ?? 0,
        totalMinutes: 0,
        shiftCount: 0,
      }
    }
    const start = new Date(shift.start_time).getTime()
    const end = new Date(shift.end_time).getTime()
    const minutes = Math.max(0, (end - start) / 60000 - (shift.break_minutes ?? 0))
    employeeMap[userId].totalMinutes += minutes
    employeeMap[userId].shiftCount += 1
  }

  // CSV generálás
  const BOM = '\uFEFF' // UTF-8 BOM Excel-hez
  const header = 'Dolgozó neve;Pozíció;Műszakok száma;Összes óra;Órabér (Ft);Bérköltség (Ft)\n'

  const rows = Object.values(employeeMap).map((emp) => {
    const hours = Math.round(emp.totalMinutes / 60 * 100) / 100
    const cost = Math.round(hours * emp.hourlyRate)
    return `${emp.name};${emp.position};${emp.shiftCount};${hours};${emp.hourlyRate};${cost}`
  })

  const csv = BOM + header + rows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="berkoltseg-${weekStart}.csv"`,
    },
  })
}
