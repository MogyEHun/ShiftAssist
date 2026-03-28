'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOpenAI, AI_MODEL } from '@/lib/openai'
import { AiShiftSuggestion } from '@/types'
import { addDays, format } from 'date-fns'
import { getCompanyUsers } from '@/lib/data/users'

const RATE_LIMIT_PER_DAY = 5

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

  const employeeMap = new Map(employees.map(e => [e.id, e]))

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

  let shiftTemplates: string
  if (numShifts === 1) {
    const end = minutesToTime(Math.min(openMinutes + durMinutes, closeMinutes))
    shiftTemplates = `1 műszak/nap: ${params.openFrom}–${end}`
  } else {
    const mid = minutesToTime(openMinutes + Math.round((closeMinutes - openMinutes) / 2))
    shiftTemplates = `2 műszak/nap:\n  - Délelőtti: ${params.openFrom}–${mid}\n  - Délutáni: ${mid}–${params.openTo}`
  }

  // Prompt összeállítása
  const prefs = params.preferences ?? {}
  const prefLines = [
    prefs.respectAvailability ? '- Vedd figyelembe az elérhetőséget: ne osztj be olyat aki unavailable' : '',
    prefs.distributeEvenly ? '- Osszd el egyenletesen a műszakokat a dolgozók között' : '',
    prefs.preferFullTime ? '- Részesítsd előnyben a teljes műszakokat' : '',
    `- Minden dolgozó max ${params.weeklyHourLimit ?? 48} órát dolgozhat ezen a héten`,
    `- Minden dolgozó kb. ${workDays} napot dolgozzon a héten (H–V prioritás)`,
  ].filter(Boolean).join('\n')

  const posBreakdown = params.positionBreakdown?.length
    ? 'Pozíció igény naponta:\n' + params.positionBreakdown.map(p => `  - ${p.position}: ${p.count} fő`).join('\n')
    : ''

  const budgetLine = params.budgetCapFt
    ? `Heti bérköltség maximum: ${params.budgetCapFt.toLocaleString('hu-HU')} Ft`
    : ''

  const availLines = (availability ?? [])
    .map(a => {
      const name = employeeMap.get(a.user_id)?.full_name ?? a.user_id
      const detail = a.status === 'partial' ? ` (${a.from_time?.slice(0,5)}–${a.to_time?.slice(0,5)})` : ''
      return `  - ${name} ${a.date}: ${a.status}${detail}`
    })
    .join('\n')

  const empHourOverrides = (params.employeeHourLimits ?? [])
    .map(({ userId, limit }) => {
      const name = employeeMap.get(userId)?.full_name ?? userId
      return `  - ${name}: max ${limit} óra`
    }).join('\n')

  const systemMessage = `Te egy precíz munkarendbeosztó asszisztens vagy. Feladatod teljes heti beosztást generálni a megadott feltételek szerint. Mindig valid JSON objektumot adsz vissza, semmi mást.`

  const userMessage = `Készíts TELJES heti beosztást az alábbi feltételek szerint.

FONTOS: Minden elérhető dolgozóhoz, minden munkanapra generálj műszakot (kivéve ha szabadságon van vagy "unavailable").

Időszak: ${params.weekStart} – ${weekEnd}
Műszakstruktúra: ${shiftTemplates}
Minimum ${params.minStaffPerDay} dolgozó egyidejűleg naponta
${budgetLine}
${posBreakdown}

Szabályok:
${prefLines}
${empHourOverrides ? 'Egyéni óralimitek:\n' + empHourOverrides : ''}
${params.note ? 'Különleges megjegyzés: ' + params.note : ''}

Dolgozók (id: név, pozíció, órabér):
${employees.map(e => `- ${e.id}: ${e.full_name} (${e.position ?? 'általános'}${(e as any).hourly_rate ? ', ' + (e as any).hourly_rate + ' Ft/h' : ''})`).join('\n') || 'Nincs dolgozó'}

Elérhetőségek ezen a héten:
${availLines || '  Nincs elérhetőségi adat (mindenki elérhető)'}

Szabadságon lévők (ne osztd be őket a szabadság idején):
${leaveRequests?.map(l => {
    const name = employeeMap.get(l.user_id)?.full_name ?? l.user_id
    return `- ${name}: ${l.start_date} – ${l.end_date}`
  }).join('\n') || 'Senki'}

Meglévő műszakok (ne duplikáld ezeket):
${existingShifts?.map(s => `- user_id:${s.user_id} ${s.start_time}–${s.end_time}`).join('\n') || 'Nincs még'}

Visszaadj CSAK egy JSON objektumot ebben a formában:
{
  "shifts": [
    {
      "suggestion_id": "<uuid v4>",
      "user_id": "<dolgozó id>",
      "start_time": "<ISO 8601, pl: ${params.weekStart}T08:00:00>",
      "end_time": "<ISO 8601>",
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
