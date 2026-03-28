'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOpenAI, AI_MODEL } from '@/lib/openai'
import { AiShiftSuggestion } from '@/types'
import { addDays, format } from 'date-fns'
import { getCompanyUsers } from '@/lib/data/users'

const RATE_LIMIT_PER_DAY = 100

interface PositionBreakdown {
  position: string
  count: number
}

interface GenerateScheduleParams {
  weekStart: string
  minStaffPerDay: number
  openFrom: string
  openTo: string
  shiftDurationHours?: number
  shiftsPerDay?: 1 | 2
  workDaysPerEmployee?: number
  note?: string
  budgetCapFt?: number
  weeklyHourLimit?: number
  employeeHourLimits?: { userId: string; limit: number }[]
  positionBreakdown?: PositionBreakdown[]
  preferences?: {
    respectAvailability?: boolean
    respectMaxHours?: boolean
    distributeEvenly?: boolean
    preferFullTime?: boolean
  }
}

export async function getRateLimitStatus(): Promise<{ used: number; limit: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { used: 0, limit: RATE_LIMIT_PER_DAY }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { used: 0, limit: RATE_LIMIT_PER_DAY }

  const admin = createAdminClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const { count } = await admin
    .from('ai_schedule_requests')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .gte('created_at', `${today}T00:00:00`)

  return { used: count ?? 0, limit: RATE_LIMIT_PER_DAY }
}

export async function generateSchedule(
  params: GenerateScheduleParams
): Promise<{ data?: AiShiftSuggestion[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profil nem található' }
  if (!['owner', 'admin', 'manager'].includes(profile.role)) {
    return { error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()

  // Rate limiting
  const today = format(new Date(), 'yyyy-MM-dd')
  const { count: todayCount } = await admin
    .from('ai_schedule_requests')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .gte('created_at', `${today}T00:00:00`)

  if ((todayCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return { error: `Napi limit elérve (${RATE_LIMIT_PER_DAY} kérés/nap). Holnap újra próbálhatod.` }
  }

  // Hét napjai
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(params.weekStart), i)
    return format(d, 'yyyy-MM-dd')
  })
  const weekEnd = weekDays[6]

  // Aktív dolgozók (visszafejtve)
  const allEmployees = await getCompanyUsers(profile.company_id, true)
  let employees = allEmployees.filter(e => ['employee', 'manager', 'admin'].includes(e.role))

  // Szabadságosok
  const { data: leaveRequests } = await admin
    .from('leave_requests')
    .select('user_id, start_date, end_date')
    .eq('company_id', profile.company_id)
    .eq('status', 'approved')
    .lte('start_date', weekEnd)
    .gte('end_date', params.weekStart)

  // Meglévő műszakok
  const { data: existingShifts } = await admin
    .from('shifts')
    .select('user_id, start_time, end_time, required_position')
    .eq('company_id', profile.company_id)
    .gte('start_time', `${params.weekStart}T00:00:00`)
    .lte('start_time', `${weekEnd}T23:59:59`)

  // Elérhetőség adatok
  const { data: availability } = await admin
    .from('availability_dates')
    .select('user_id, date, status, from_time, to_time')
    .eq('company_id', profile.company_id)
    .gte('date', params.weekStart)
    .lte('date', weekEnd)

  // Műszak template(k) kiszámolása
  const shiftDur = params.shiftDurationHours ?? 8
  const numShifts = params.shiftsPerDay ?? 1
  const workDays = params.workDaysPerEmployee ?? 5

  function timeToMinutes(t: string) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  function minutesToTime(m: number) {
    const hh = String(Math.floor(m / 60) % 24).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const openMinutes = timeToMinutes(params.openFrom)
  const closeMinutes = timeToMinutes(params.openTo)
  const durMinutes = shiftDur * 60

  const prefs = params.preferences ?? {}

  // Kiszámolt műszakidők
  const openMin = openMinutes
  const closeMin = closeMinutes
  function calcShiftTimes(slotIndex: number): { start: string; end: string } {
    if (numShifts === 1) {
      return {
        start: params.openFrom,
        end: minutesToTime(Math.min(openMin + durMinutes, closeMin)),
      }
    }
    const mid = openMin + Math.round((closeMin - openMin) / 2)
    return slotIndex % 2 === 0
      ? { start: params.openFrom, end: minutesToTime(mid) }
      : { start: minutesToTime(mid), end: params.openTo }
  }

  // Szabadság lookup
  const leaveByUser = new Map<string, { start_date: string; end_date: string }[]>()
  for (const l of leaveRequests ?? []) {
    if (!leaveByUser.has(l.user_id)) leaveByUser.set(l.user_id, [])
    leaveByUser.get(l.user_id)!.push(l)
  }

  // Meglévő műszakok lookup
  const existingByUser = new Map<string, Set<string>>()
  for (const s of existingShifts ?? []) {
    const date = s.start_time.slice(0, 10)
    if (!existingByUser.has(s.user_id)) existingByUser.set(s.user_id, new Set())
    existingByUser.get(s.user_id)!.add(date)
  }

  // Unavailable lookup
  const unavailSet = new Set<string>()
  if (prefs.respectAvailability) {
    for (const a of availability ?? []) {
      if (a.status === 'unavailable') unavailSet.add(`${a.user_id}:${a.date}`)
    }
  }

  const dayLabels = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

  // Server-side: előre kiszámolni ki mikor dolgozik
  interface Slot {
    userId: string
    name: string
    position: string | null
    date: string
    dayLabel: string
    start: string
    end: string
  }
  const requiredSlots: Slot[] = []
  let slotCounter = 0

  for (const emp of employees) {
    const leaves = leaveByUser.get(emp.id) ?? []
    const existingDates = existingByUser.get(emp.id) ?? new Set()
    let daysAssigned = existingDates.size

    for (let i = 0; i < weekDays.length; i++) {
      if (daysAssigned >= workDays) break
      const day = weekDays[i]
      if (existingDates.has(day)) continue
      const onLeave = leaves.some(l => l.start_date <= day && l.end_date >= day)
      if (onLeave) continue
      if (unavailSet.has(`${emp.id}:${day}`)) continue

      const { start, end } = calcShiftTimes(slotCounter++)
      requiredSlots.push({
        userId: emp.id,
        name: emp.full_name,
        position: emp.position,
        date: day,
        dayLabel: dayLabels[i],
        start,
        end,
      })
      daysAssigned++
    }
  }

  if (requiredSlots.length === 0) {
    return { error: 'Nincs generálandó műszak (mindenki be van osztva vagy szabadságon van).' }
  }

  // Ha nincs speciális utasítás, AI nélkül generálunk
  if (!params.note) {
    const { randomUUID } = await import('crypto')
    const directShifts: AiShiftSuggestion[] = requiredSlots.map(s => ({
      suggestion_id: randomUUID(),
      user_id: s.userId,
      start_time: `${s.date}T${s.start}:00`,
      end_time: `${s.date}T${s.end}:00`,
      required_position: s.position ?? null,
      notes: null,
    }))
    await admin.from('ai_schedule_requests').insert({ company_id: profile.company_id })
    return { data: directShifts }
  }

  // Ha van speciális utasítás → AI módosíthatja a slotokat
  const systemMessage = `Te egy precíz munkarendbeosztó asszisztens vagy. Kapsz egy előre kiszámított műszaklistát és speciális utasítást. Az utasítás alapján módosíthatod a listát (időpontok, pozíciók, megjegyzések), de NE töröld és NE adj hozzá sorokat. Mindig valid JSON objektumot adsz vissza, semmi mást.`

  const slotList = requiredSlots
    .map((s, i) => `${i + 1}. user_id:"${s.userId}" nev:"${s.name}" datum:"${s.date}" (${s.dayLabel}) start:"${s.start}" end:"${s.end}" pozicio:"${s.position ?? 'nincs'}"`)
    .join('\n')

  const userMessage = `Az alábbi ${requiredSlots.length} műszakot kell visszaadnod JSON formában.

Speciális utasítás (csak erre figyelj, egyébként ne változtass): ${params.note}

Műszakok:
${slotList}

Visszaadj CSAK ezt a JSON objektumot (pontosan ${requiredSlots.length} elem a shifts tömbben):
{
  "shifts": [
    {
      "suggestion_id": "<uuid v4>",
      "user_id": "<az adott sor user_id-ja>",
      "start_time": "<YYYY-MM-DDTHH:MM:00>",
      "end_time": "<YYYY-MM-DDTHH:MM:00>",
      "required_position": "<pozíció vagy null>",
      "notes": null
    }
  ]
}`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 16000,
    })

    const choice = response.choices[0]
    if (choice?.finish_reason === 'length') {
      return { error: 'Az AI válasz túl hosszú (túl sok dolgozó/nap). Próbáld kevesebb dolgozóval vagy rövidebb hétre.' }
    }
    const raw = choice?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)
    const arr: AiShiftSuggestion[] = Array.isArray(parsed)
      ? parsed
      : parsed.shifts ?? parsed.suggestions ?? Object.values(parsed)[0] ?? []

    // Rate limit bejegyzés
    await admin.from('ai_schedule_requests').insert({ company_id: profile.company_id })

    return { data: arr }
  } catch (err: any) {
    return { error: err.message ?? 'AI hiba' }
  }
}
