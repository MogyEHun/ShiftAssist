'use client'

import { useRouter } from 'next/navigation'
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, parseISO } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, Clock, MapPin, ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { requestSwap } from '@/app/actions/schedule'
import { SHIFT_STATUS_COLORS } from '@/types'
import type { AvailabilityDate } from '@/types'
import { AvailabilityCalendar } from '@/components/availability/AvailabilityCalendar'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Shift {
  id: string
  title: string | null
  start_time: string
  end_time: string
  location: string | null
  required_position: string | null
  status: string
  notes: string | null
}

interface Props {
  shifts: Shift[]
  userId: string
  view: 'day' | 'week' | 'month' | 'availability'
  currentDate: string
  availabilityEnabled?: boolean
  availabilityDates?: AvailabilityDate[]
  initialMonth?: string
}

export function MyScheduleClient({ shifts: initialShifts, view, currentDate, availabilityEnabled, availabilityDates, initialMonth }: Props) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [shifts, setShifts] = useState(initialShifts)
  const [loadingSwap, setLoadingSwap] = useState<string | null>(null)
  const [swapMsg, setSwapMsg] = useState<{ text: string; isError: boolean } | null>(null)

  const dfLocale = locale === 'en' ? enUS : hu
  const baseDate = new Date(currentDate)

  function navigate(dir: 'prev' | 'next') {
    let newDate: Date
    if (view === 'day') newDate = dir === 'next' ? addDays(baseDate, 1) : subDays(baseDate, 1)
    else if (view === 'week') newDate = dir === 'next' ? addWeeks(baseDate, 1) : subWeeks(baseDate, 1)
    else newDate = dir === 'next' ? addMonths(baseDate, 1) : subMonths(baseDate, 1)
    router.push(`/my/schedule?view=${view}&date=${format(newDate, 'yyyy-MM-dd')}`)
  }

  function changeView(v: 'day' | 'week' | 'month' | 'availability') {
    router.push(`/my/schedule?view=${v}&date=${currentDate}`)
  }

  function goToToday() {
    router.push(`/my/schedule?view=${view}&date=${format(new Date(), 'yyyy-MM-dd')}`)
  }

  const isCurrentPeriodToday = (() => {
    if (view === 'availability') return true
    const today = format(new Date(), 'yyyy-MM-dd')
    if (view === 'day') return currentDate === today
    if (view === 'week') {
      const ws = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      return format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd') === ws
    }
    return format(startOfMonth(baseDate), 'yyyy-MM') === format(startOfMonth(new Date()), 'yyyy-MM')
  })()

  async function handleSwapRequest(shiftId: string) {
    setLoadingSwap(shiftId)
    const result = await requestSwap(shiftId)
    setLoadingSwap(null)
    if (result.error) {
      setSwapMsg({ text: `${t('mySchedule.swapError')}${result.error}`, isError: true })
    } else {
      setSwapMsg({ text: t('mySchedule.swapSent'), isError: false })
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'swappable' } : s))
    }
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  let navLabel = ''
  if (view === 'day') {
    navLabel = currentDate === todayStr
      ? `${t('nav.today')} – ${format(baseDate, locale === 'en' ? 'MMMM d, EEEE' : 'MMMM d., EEEE', { locale: dfLocale })}`
      : format(baseDate, locale === 'en' ? 'MMMM d, yyyy (EEEE)' : 'yyyy. MMMM d., EEEE', { locale: dfLocale })
  } else if (view === 'week') {
    const ws = startOfWeek(baseDate, { weekStartsOn: 1 })
    const we = endOfWeek(baseDate, { weekStartsOn: 1 })
    navLabel = `${format(ws, 'MMM d.', { locale: dfLocale })} – ${format(we, 'MMM d.', { locale: dfLocale })}`
  } else {
    navLabel = format(baseDate, locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })
  }

  const scheduleViews: { v: 'day' | 'week' | 'month' | 'availability'; label: string }[] = [
    { v: 'day', label: t('mySchedule.dayView') },
    { v: 'week', label: t('mySchedule.weekView') },
    { v: 'month', label: t('mySchedule.monthView') },
    ...(availabilityEnabled !== false ? [{ v: 'availability' as const, label: t('mySchedule.availabilityView') }] : []),
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Header + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900 flex-1">
          {view === 'availability' ? t('mySchedule.myAvailability') : t('mySchedule.title')}
        </h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto flex-shrink-0">
          {scheduleViews.map(({ v, label }) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {view !== 'availability' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('prev')}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-gray-800 capitalize">{navLabel}</span>
          <button
            onClick={() => navigate('next')}
            className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
          {!isCurrentPeriodToday && (
            <button
              onClick={goToToday}
              className="px-3 py-2 rounded-lg bg-[#1a5c3a] text-white text-xs font-semibold hover:bg-[#154d30] transition-colors"
            >
              {t('nav.today')}
            </button>
          )}
        </div>
      )}

      {/* Swap feedback */}
      {swapMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${
          swapMsg.isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-[#1a5c3a]'
        }`}>
          {swapMsg.text}
        </div>
      )}

      {/* Availability view */}
      {view === 'availability' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">{t('mySchedule.availabilityHint')}</p>
          <AvailabilityCalendar initialData={availabilityDates ?? []} initialMonth={initialMonth ?? format(new Date(), 'yyyy-MM')} />
        </div>
      )}

      {/* Day view */}
      {view === 'day' && (
        <DayViewSection shifts={shifts} date={currentDate} onSwap={handleSwapRequest} loadingSwap={loadingSwap} />
      )}

      {/* Week view */}
      {view === 'week' && (
        <WeekViewSection shifts={shifts} weekStart={format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')} onSwap={handleSwapRequest} loadingSwap={loadingSwap} />
      )}

      {/* Month view */}
      {view === 'month' && (
        <MonthViewSection shifts={shifts} monthStart={format(startOfMonth(baseDate), 'yyyy-MM-dd')} onSwap={handleSwapRequest} loadingSwap={loadingSwap} />
      )}
    </div>
  )
}

function DayViewSection({ shifts, onSwap, loadingSwap }: {
  shifts: Shift[]; date: string; onSwap: (id: string) => void; loadingSwap: string | null
}) {
  const { t } = useTranslation()
  if (shifts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">{t('mySchedule.noShiftsDay')}</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {shifts.map(shift => <ShiftCard key={shift.id} shift={shift} onSwap={onSwap} loadingSwap={loadingSwap} />)}
    </div>
  )
}

function WeekViewSection({ shifts, weekStart, onSwap, loadingSwap }: {
  shifts: Shift[]; weekStart: string; onSwap: (id: string) => void; loadingSwap: string | null
}) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  if (shifts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">{t('mySchedule.noShiftsWeek')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const dayShifts = shifts.filter(s => s.start_time.startsWith(dayKey))
        const todayHL = isToday(day)

        return (
          <div key={dayKey}>
            <div className={`flex items-center gap-2 mb-1.5 ${todayHL ? 'text-[#1a5c3a]' : 'text-gray-500'}`}>
              <span className="text-sm font-semibold">
                {format(day, locale === 'en' ? 'EEEE, MMM d' : 'EEEE, MMM d.', { locale: dfLocale })}
              </span>
              {todayHL && <span className="text-xs bg-[#1a5c3a] text-white px-2 py-0.5 rounded-full">{t('nav.today')}</span>}
            </div>
            {dayShifts.length === 0 ? (
              <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-xs text-gray-400">{t('mySchedule.noShiftsInDay')}</div>
            ) : (
              <div className="space-y-2">
                {dayShifts.map(shift => <ShiftCard key={shift.id} shift={shift} onSwap={onSwap} loadingSwap={loadingSwap} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MonthViewSection({ shifts, monthStart, onSwap, loadingSwap }: {
  shifts: Shift[]; monthStart: string; onSwap: (id: string) => void; loadingSwap: string | null
}) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu
  const base = new Date(monthStart)
  const days = eachDayOfInterval({ start: startOfMonth(base), end: endOfMonth(base) })

  if (shifts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">{t('mySchedule.noShiftsMonth')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const dayShifts = shifts.filter(s => s.start_time.startsWith(dayKey))
        const todayHL = isToday(day)

        return (
          <div key={dayKey}>
            <div className={`flex items-center gap-2 mb-1.5 ${todayHL ? 'text-[#1a5c3a]' : 'text-gray-500'}`}>
              <span className="text-sm font-semibold">
                {format(day, locale === 'en' ? 'EEEE, MMM d' : 'EEEE, MMM d.', { locale: dfLocale })}
              </span>
              {todayHL && <span className="text-xs bg-[#1a5c3a] text-white px-2 py-0.5 rounded-full">{t('nav.today')}</span>}
            </div>
            {dayShifts.length === 0 ? (
              <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-xs text-gray-400">{t('mySchedule.noShiftsInDay')}</div>
            ) : (
              <div className="space-y-2">
                {dayShifts.map(shift => <ShiftCard key={shift.id} shift={shift} onSwap={onSwap} loadingSwap={loadingSwap} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ShiftCard({ shift, onSwap, loadingSwap }: {
  shift: Shift; onSwap: (id: string) => void; loadingSwap: string | null
}) {
  const { t } = useTranslation()
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start justify-between gap-3 ${
      shift.status === 'swappable' ? 'border-amber-200' : 'border-gray-100'
    }`}>
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">
            {shift.title || shift.required_position || t('mySchedule.shift')}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            (SHIFT_STATUS_COLORS as Record<string, string>)[shift.status] ?? 'bg-gray-100 text-gray-600'
          }`}>
            {t(`shiftStatus.${shift.status}`)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {format(parseISO(shift.start_time), 'HH:mm')}–{format(parseISO(shift.end_time), 'HH:mm')}
          </span>
        </div>
        {shift.location && (
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span>{shift.location}</span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0">
        {shift.status === 'published' && (
          <button
            onClick={() => onSwap(shift.id)}
            disabled={loadingSwap === shift.id}
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors disabled:opacity-50 bg-amber-50 px-2.5 py-1.5 rounded-lg"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t('shiftCard.requestSwap')}
          </button>
        )}
        {shift.status === 'swappable' && (
          <span className="text-xs text-amber-500 font-medium">{t('mySchedule.swapInProgress')}</span>
        )}
      </div>
    </div>
  )
}
