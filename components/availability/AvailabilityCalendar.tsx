'use client'

import { useState, useTransition } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, parseISO,
  addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { AvailabilityDate, AvailabilityStatus } from '@/types'
import { saveAvailabilityDate, deleteAvailabilityDate } from '@/app/actions/availability'
import { useTranslation } from '@/components/providers/LanguageProvider'

type CalView = 'week' | 'month'

interface Props {
  initialData: AvailabilityDate[]
  initialMonth: string  // 'yyyy-MM'
}

export function AvailabilityCalendar({ initialData, initialMonth }: Props) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu

  const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; dot: string; cell: string; text: string; rowBg: string }> = {
    available:   { label: t('availability.allDay'),       dot: 'bg-green-500', cell: 'bg-green-50 border-green-200',  text: 'text-green-700',  rowBg: 'bg-green-50'  },
    partial:     { label: t('availability.partialShort'), dot: 'bg-amber-400', cell: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  rowBg: 'bg-amber-50'  },
    unavailable: { label: t('availability.unavailableMe'),dot: 'bg-red-400',   cell: 'bg-red-50 border-red-200',      text: 'text-red-600',    rowBg: 'bg-red-50'    },
  }

  const [data, setData] = useState<Map<string, AvailabilityDate>>(
    () => new Map(initialData.map(d => [d.date, d]))
  )
  const [calView, setCalView] = useState<CalView>('week')
  const [currentMonth, setCurrentMonth] = useState(() => parseISO(initialMonth + '-01'))
  const [currentWeekStart, setCurrentWeekStart] = useState(
    () => startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [fromTime, setFromTime] = useState('08:00')
  const [toTime, setToTime] = useState('16:00')
  const [isPending, startTransition] = useTransition()

  // Month grid days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd })

  // Week days
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd })

  // Weekday header labels from actual dates (locale-aware)
  const weekdayHeaders = weekDays.map(d => format(d, 'EEEEEE', { locale: dfLocale }))

  function openDay(dateStr: string) {
    if (selected === dateStr) { setSelected(null); return }
    const entry = data.get(dateStr)
    setFromTime(entry?.status === 'partial' ? (entry.from_time ?? '08:00') : '08:00')
    setToTime(entry?.status === 'partial' ? (entry.to_time ?? '16:00') : '16:00')
    setSelected(dateStr)
  }

  function setStatus(dateStr: string, status: AvailabilityStatus) {
    const from = status === 'partial' ? fromTime : null
    const to = status === 'partial' ? toTime : null

    setData(prev => {
      const next = new Map(prev)
      const existing = next.get(dateStr)
      next.set(dateStr, {
        id: existing?.id ?? '',
        company_id: existing?.company_id ?? '',
        user_id: existing?.user_id ?? '',
        date: dateStr,
        status,
        from_time: from,
        to_time: to,
        note: null,
        created_at: existing?.created_at ?? '',
      })
      return next
    })

    if (status !== 'partial') setSelected(null)

    startTransition(async () => {
      const result = await saveAvailabilityDate({ date: dateStr, status, from_time: from, to_time: to })
      if (result.error) {
        setData(prev => { const n = new Map(prev); n.delete(dateStr); return n })
      }
    })
  }

  function savePartialTime(dateStr: string) {
    setStatus(dateStr, 'partial')
    setSelected(null)
  }

  function clearDay(dateStr: string) {
    setData(prev => { const n = new Map(prev); n.delete(dateStr); return n })
    setSelected(null)
    startTransition(async () => { await deleteAvailabilityDate(dateStr) })
  }

  const navLabel = calView === 'month'
    ? format(currentMonth, locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })
    : `${format(currentWeekStart, 'MMM d.', { locale: dfLocale })} – ${format(weekEnd, 'MMM d.', { locale: dfLocale })}`

  function navPrev() {
    setSelected(null)
    if (calView === 'month') setCurrentMonth(m => subMonths(m, 1))
    else setCurrentWeekStart(w => subWeeks(w, 1))
  }

  function navNext() {
    setSelected(null)
    if (calView === 'month') setCurrentMonth(m => addMonths(m, 1))
    else setCurrentWeekStart(w => addWeeks(w, 1))
  }

  function MonthDayPopup({ dateStr, day }: { dateStr: string; day: Date }) {
    const entry = data.get(dateStr)
    return (
      <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">
            {format(day, locale === 'en' ? 'MMM d, EEEE' : 'MMM d., EEEE', { locale: dfLocale })}
          </span>
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {(['available', 'partial', 'unavailable'] as AvailabilityStatus[]).map(s => (
            <button
              key={s}
              onClick={() => s === 'partial' ? undefined : setStatus(dateStr, s)}
              disabled={isPending}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                entry?.status === s
                  ? `${STATUS_CONFIG[s].cell} ${STATUS_CONFIG[s].text}`
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1.5">{t('availability.partialTime')}</p>
          <div className="flex items-center gap-1">
            <input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)}
              className="flex-1 min-w-0 px-1.5 py-1 border border-gray-200 rounded text-xs" />
            <span className="text-gray-400 text-xs flex-shrink-0">–</span>
            <input type="time" value={toTime} onChange={e => setToTime(e.target.value)}
              className="flex-1 min-w-0 px-1.5 py-1 border border-gray-200 rounded text-xs" />
          </div>
          <button onClick={() => savePartialTime(dateStr)} disabled={isPending}
            className="mt-1.5 w-full py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200 transition-colors">
            {t('availability.savePartial')}
          </button>
        </div>

        {entry && (
          <button onClick={() => clearDay(dateStr)} disabled={isPending}
            className="mt-2 w-full py-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
            {t('common.delete')}
          </button>
        )}
      </div>
    )
  }

  function WeekDayPanel({ dateStr }: { dateStr: string }) {
    const entry = data.get(dateStr)
    return (
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['available', 'partial', 'unavailable'] as AvailabilityStatus[]).map(s => (
            <button
              key={s}
              onClick={() => s === 'partial' ? undefined : setStatus(dateStr, s)}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                entry?.status === s
                  ? `${STATUS_CONFIG[s].cell} ${STATUS_CONFIG[s].text}`
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}

          {entry && (
            <button onClick={() => clearDay(dateStr)} disabled={isPending}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5">
              {t('common.delete')}
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-500 flex-shrink-0">{t('availability.partialShort')}:</span>
          <input
            type="time"
            value={fromTime}
            onChange={e => setFromTime(e.target.value)}
            className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
          />
          <span className="text-gray-400 text-sm flex-shrink-0">–</span>
          <input
            type="time"
            value={toTime}
            onChange={e => setToTime(e.target.value)}
            className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
          />
          <button
            onClick={() => savePartialTime(dateStr)}
            disabled={isPending}
            className="ml-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors flex-shrink-0"
          >
            {t('availability.saveTime')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 rounded-t-2xl">
        <button onClick={navPrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-gray-800 capitalize">{navLabel}</span>
        <button onClick={navNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>

        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 ml-2">
          {(['week', 'month'] as CalView[]).map(v => (
            <button
              key={v}
              onClick={() => { setCalView(v); setSelected(null) }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                calView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v === 'week' ? t('availability.weekView') : t('availability.monthView')}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
            {v.label}
          </span>
        ))}
      </div>

      {/* Month view */}
      {calView === 'month' && (
        <div className="overflow-visible">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekdayHeaders.map((d, i) => (
              <div key={i} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const entry = data.get(dateStr)
              const inMonth = isSameMonth(day, currentMonth)
              const todayHL = isToday(day)
              const isSelected = selected === dateStr
              const cfg = entry ? STATUS_CONFIG[entry.status] : null

              return (
                <div key={dateStr} className="relative">
                  <button
                    onClick={() => inMonth && openDay(dateStr)}
                    disabled={!inMonth}
                    className={`w-full min-h-[64px] p-1.5 border-b border-r border-gray-100 text-left transition-colors ${
                      !inMonth ? 'bg-gray-50/50 cursor-default'
                      : cfg ? `${cfg.cell} border hover:opacity-80`
                      : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      todayHL ? 'bg-[#1a5c3a] text-white'
                      : inMonth ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {cfg && inMonth && (
                      <div className={`text-[10px] font-medium leading-tight ${cfg.text}`}>
                        {entry?.status === 'partial' && entry.from_time
                          ? `${entry.from_time.slice(0, 5)}–${entry.to_time?.slice(0, 5) ?? ''}`
                          : cfg.label}
                      </div>
                    )}
                  </button>
                  {isSelected && inMonth && <MonthDayPopup dateStr={dateStr} day={day} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Week view */}
      {calView === 'week' && (
        <div className="divide-y divide-gray-100 rounded-b-2xl overflow-hidden">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const entry = data.get(dateStr)
            const todayHL = isToday(day)
            const isSelected = selected === dateStr
            const cfg = entry ? STATUS_CONFIG[entry.status] : null

            return (
              <div key={dateStr}>
                <div className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                  cfg ? cfg.rowBg : 'bg-white'
                }`}>
                  <div className="w-28 flex-shrink-0">
                    <div className={`text-sm font-semibold capitalize ${todayHL ? 'text-[#1a5c3a]' : 'text-gray-800'}`}>
                      {format(day, 'EEEE', { locale: dfLocale })}
                    </div>
                    <div className={`text-xs mt-0.5 ${todayHL ? 'text-[#1a5c3a]/70' : 'text-gray-400'}`}>
                      {format(day, 'MMM d.', { locale: dfLocale })}
                      {todayHL && <span className="ml-1 text-[10px] bg-[#1a5c3a] text-white px-1.5 py-0.5 rounded-full">{t('nav.today')}</span>}
                    </div>
                  </div>

                  {cfg ? (
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.cell} ${cfg.text}`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {entry?.status === 'partial' && entry.from_time
                        ? `${entry.from_time.slice(0, 5)}–${entry.to_time?.slice(0, 5) ?? ''}`
                        : cfg.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}

                  <div className="flex-1" />

                  <button
                    onClick={() => openDay(dateStr)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors border ${
                      isSelected
                        ? 'bg-gray-200 text-gray-700 border-gray-300'
                        : 'text-gray-500 hover:text-gray-700 border-gray-200 hover:bg-gray-100 bg-white'
                    }`}
                  >
                    {cfg ? t('availability.editDay') : t('availability.setDay')}
                  </button>
                </div>

                {isSelected && <WeekDayPanel dateStr={dateStr} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
