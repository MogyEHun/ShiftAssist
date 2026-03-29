import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays, Palmtree, RefreshCcw, ClipboardList, ChevronRight } from 'lucide-react'
import { TodayCard } from '@/components/employee/TodayCard'
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { getLocale, getT } from '@/lib/i18n'

export default async function MyHomePage() {
  const locale = getLocale()
  const t = getT(locale)
  const dfLocale = locale === 'en' ? enUS : hu
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const { data: weekShifts } = await supabase
    .from('shifts')
    .select('id, title, start_time, end_time, location, required_position, status')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .gte('start_time', weekStart.toISOString())
    .lte('start_time', weekEnd.toISOString())
    .order('start_time', { ascending: true })

  const todayShifts = (weekShifts ?? []).filter(s =>
    s.start_time >= todayStart.toISOString() && s.start_time <= todayEnd.toISOString()
  )

  const { data: futureShifts } = await supabase
    .from('shifts')
    .select('id, title, start_time, end_time, location, required_position, status')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .gt('start_time', todayEnd.toISOString())
    .order('start_time', { ascending: true })
    .limit(1)
  const nextShift = futureShifts?.[0] ?? null

  const { data: pendingLeave } = await supabase
    .from('leave_requests')
    .select('id, type, start_date, end_date, status')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .limit(3)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayKey = format(now, 'yyyy-MM-dd')

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('home.today')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {now.toLocaleDateString(locale === 'en' ? 'en-GB' : 'hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <TodayCard todayShifts={todayShifts} nextShift={nextShift} />

      {pendingLeave && pendingLeave.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('home.pendingRequests')}</h2>
          <div className="space-y-2">
            {pendingLeave.map(req => (
              <div key={req.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
                <Palmtree className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900">{t('home.leaveRequest')}</p>
                  <p className="text-xs text-amber-600">{req.start_date} – {req.end_date}</p>
                </div>
                <span className="text-xs text-amber-500 font-medium flex-shrink-0">{t('home.waiting')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('home.quickActions')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/my/leave" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 hover:border-[#1a5c3a]/30 hover:bg-[#1a5c3a]/5 transition-colors">
            <Palmtree className="h-5 w-5 text-[#1a5c3a]" />
            <span className="text-sm font-medium text-gray-800">{t('home.requestLeave')}</span>
          </Link>
          <Link href="/my/tasks" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 hover:border-[#1a5c3a]/30 hover:bg-[#1a5c3a]/5 transition-colors">
            <ClipboardList className="h-5 w-5 text-[#1a5c3a]" />
            <span className="text-sm font-medium text-gray-800">{t('home.myTasks')}</span>
          </Link>
          <Link href="/my/swap" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 hover:border-[#1a5c3a]/30 hover:bg-[#1a5c3a]/5 transition-colors">
            <RefreshCcw className="h-5 w-5 text-[#1a5c3a]" />
            <span className="text-sm font-medium text-gray-800">{t('home.swapOffers')}</span>
          </Link>
          <Link href="/my/schedule?view=availability" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 hover:border-[#1a5c3a]/30 hover:bg-[#1a5c3a]/5 transition-colors">
            <CalendarDays className="h-5 w-5 text-[#1a5c3a]" />
            <span className="text-sm font-medium text-gray-800">{t('home.myAvailability')}</span>
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('home.weekSchedule')}</h2>
          <Link href="/my/schedule" className="flex items-center gap-1 text-xs text-[#1a5c3a] font-medium hover:underline">
            {t('home.fullSchedule')} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {weekDays.map((day, i) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayShifts = (weekShifts ?? []).filter(s => s.start_time.startsWith(dayKey))
              const isToday = dayKey === todayKey
              return (
                <div key={i} className={"flex flex-col items-center p-2 min-h-[88px]" + (isToday ? " bg-[#1a5c3a]/5" : "")}>
                  <span className={"text-[10px] font-semibold uppercase mb-1 " + (isToday ? "text-[#1a5c3a]" : "text-gray-400")}>
                    {format(day, 'EEE', { locale: dfLocale })}
                  </span>
                  <div className={"text-xs font-bold mb-2 w-6 h-6 flex items-center justify-center rounded-full " + (isToday ? "bg-[#1a5c3a] text-white" : "text-gray-700")}>
                    {format(day, 'd')}
                  </div>
                  <div className="flex flex-col gap-0.5 w-full">
                    {dayShifts.length === 0 ? (
                      <div className="h-px bg-gray-100 mx-auto w-4 mt-1" />
                    ) : (
                      dayShifts.slice(0, 2).map(s => (
                        <div key={s.id} className="bg-[#1a5c3a]/10 text-[#1a5c3a] rounded text-[9px] font-semibold px-0.5 py-0.5 text-center leading-tight">
                          {format(parseISO(s.start_time), 'HH:mm')}<br />{format(parseISO(s.end_time), 'HH:mm')}
                        </div>
                      ))
                    )}
                    {dayShifts.length > 2 && (
                      <div className="text-[9px] text-gray-400 text-center">+{dayShifts.length - 2}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
