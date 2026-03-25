import { createClient } from '@/lib/supabase/server'
import { MyScheduleClient } from './MyScheduleClient'
import { getMyAvailabilityDates } from '@/app/actions/availability'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'
import type { AvailabilityDate } from '@/types'

export default async function MySchedulePage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string; month?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const view = searchParams.view ?? 'week'
  const dateParam = searchParams.date ?? format(new Date(), 'yyyy-MM-dd')
  const baseDate = new Date(dateParam)

  // Availability_enabled lekérés a cégből
  const { data: userRow } = await supabase
    .from('users')
    .select('companies(availability_enabled)')
    .eq('id', user.id)
    .single()
  const availabilityEnabled = (userRow?.companies as { availability_enabled?: boolean } | null)?.availability_enabled ?? true

  // Ha availability nézet, csak az availability adatot töltjük be
  let availabilityDates: AvailabilityDate[] = []
  let availabilityMonth = searchParams.month ?? format(new Date(), 'yyyy-MM')
  let shifts: any[] = []

  if (view === 'availability') {
    availabilityDates = await getMyAvailabilityDates(availabilityMonth)
  } else {
    // Lekérési intervallum view alapján
    let rangeStart: string
    let rangeEnd: string

    if (view === 'day') {
      rangeStart = `${dateParam}T00:00:00`
      rangeEnd = `${dateParam}T23:59:59`
    } else if (view === 'month') {
      rangeStart = format(startOfMonth(baseDate), 'yyyy-MM-dd') + 'T00:00:00'
      rangeEnd = format(endOfMonth(baseDate), 'yyyy-MM-dd') + 'T23:59:59'
    } else {
      const ws = startOfWeek(baseDate, { weekStartsOn: 1 })
      const we = endOfWeek(baseDate, { weekStartsOn: 1 })
      rangeStart = format(ws, 'yyyy-MM-dd') + 'T00:00:00'
      rangeEnd = format(we, 'yyyy-MM-dd') + 'T23:59:59'
    }

    const { data } = await supabase
      .from('shifts')
      .select('id, title, start_time, end_time, location, required_position, status, notes')
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .gte('start_time', rangeStart)
      .lte('start_time', rangeEnd)
      .order('start_time', { ascending: true })
    shifts = data ?? []
  }

  return (
    <MyScheduleClient
      shifts={shifts}
      userId={user.id}
      view={view as 'day' | 'week' | 'month' | 'availability'}
      currentDate={dateParam}
      availabilityEnabled={availabilityEnabled}
      availabilityDates={availabilityDates}
      initialMonth={availabilityMonth}
    />
  )
}
