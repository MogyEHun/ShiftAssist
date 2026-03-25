'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO,
  addMonths, subMonths, isWeekend, isToday,
  startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AvailabilityToggle } from './AvailabilityToggle'
import type { StaffAvailabilityDates } from '@/app/actions/availability'
import type { AvailabilityDate } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  availabilityEnabled: boolean
  staff: StaffAvailabilityDates[]
  initialMonth: string  // 'yyyy-MM'
}

export function AvailabilityDashboardView({ availabilityEnabled, staff, initialMonth }: Props) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu

  const [calView, setCalView] = useState<'week' | 'month'>('month')
  const [currentMonth, setCurrentMonth] = useState(() => parseISO(initialMonth + '-01'))
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd })

  const statusTooltip: Record<string, string> = {
    available:   t('availability.allDay'),
    partial:     t('availability.partialShort'),
    unavailable: t('availability.notAvailable'),
  }

  function getEntry(dates: AvailabilityDate[], dateStr: string) {
    return dates.find(d => d.date === dateStr)
  }

  function navPrev() {
    if (calView === 'month') setCurrentMonth(m => subMonths(m, 1))
    else setCurrentWeekStart(w => subWeeks(w, 1))
  }

  function navNext() {
    if (calView === 'month') setCurrentMonth(m => addMonths(m, 1))
    else setCurrentWeekStart(w => addWeeks(w, 1))
  }

  const navLabel = calView === 'month'
    ? format(currentMonth, locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })
    : `${format(currentWeekStart, 'MMM d.', { locale: dfLocale })} – ${format(weekEnd, 'MMM d.', { locale: dfLocale })}`

  return (
    <div className="space-y-4 w-full">
      <AvailabilityToggle enabled={availabilityEnabled} />

      {!availabilityEnabled && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
          {t('availability.disabledMsg')}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {/* Navigation + view toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={navPrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 capitalize">{navLabel}</span>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setCalView('week')}
                className={`px-3 py-1.5 transition-colors ${calView === 'week' ? 'bg-[#1a5c3a] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {t('availability.weekView')}
              </button>
              <button
                onClick={() => setCalView('month')}
                className={`px-3 py-1.5 transition-colors ${calView === 'month' ? 'bg-[#1a5c3a] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {t('availability.monthView')}
              </button>
            </div>
            <button onClick={navNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {t('availability.noDataForPeriod')}
          </div>
        ) : calView === 'week' ? (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header */}
              <div
                className="grid sticky top-0 z-10 bg-gray-50 border-b border-gray-200"
                style={{ gridTemplateColumns: '180px repeat(7, 1fr)' }}
              >
                <div className="border-r border-gray-200 p-3" />
                {weekDays.map(day => {
                  const todayHL = isToday(day)
                  const weekend = isWeekend(day)
                  return (
                    <div
                      key={format(day, 'yyyy-MM-dd')}
                      className={`border-r border-gray-200 p-3 text-center ${todayHL ? 'bg-[#1a5c3a]/8' : ''}`}
                    >
                      <div className={`text-xs font-medium uppercase tracking-wide ${weekend ? 'text-gray-300' : 'text-gray-500'}`}>
                        {format(day, 'EEE', { locale: dfLocale }).slice(0, 3)}
                      </div>
                      <div className={`text-lg font-bold mt-0.5 leading-none ${
                        todayHL
                          ? 'text-white bg-[#1a5c3a] w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                          : weekend ? 'text-gray-300' : 'text-gray-800'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Rows */}
              {staff.map(emp => (
                <div
                  key={emp.user_id}
                  className="grid border-b border-gray-100 last:border-0 hover:bg-gray-50/40 transition-colors"
                  style={{ gridTemplateColumns: '180px repeat(7, 1fr)' }}
                >
                  <div className="border-r border-gray-200 p-3 flex items-center gap-2 bg-white sticky left-0 z-10">
                    <div className="h-8 w-8 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1a5c3a] uppercase">
                      {emp.full_name.slice(0, 2)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-gray-800 truncate">{emp.full_name}</p>
                      {emp.position && <p className="text-[10px] text-gray-400 truncate">{emp.position}</p>}
                    </div>
                  </div>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const entry = getEntry(emp.dates, dateStr)
                    const todayHL = isToday(day)
                    const weekend = isWeekend(day)
                    return (
                      <div
                        key={dateStr}
                        className={`border-r border-gray-200 p-2 flex items-center justify-center min-h-[60px] ${
                          todayHL ? 'bg-[#1a5c3a]/5' : weekend ? 'bg-gray-50/60' : ''
                        }`}
                      >
                        {entry ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                            entry.status === 'available'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : entry.status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {entry.status === 'available'
                              ? t('availability.allDay')
                              : entry.status === 'partial'
                              ? `${entry.from_time?.slice(0, 5)}–${entry.to_time?.slice(0, 5)}`
                              : t('availability.notAvailable')}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs select-none">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${180 + monthDays.length * 72}px` }}>
              {/* Header */}
              <div
                className="grid sticky top-0 z-10 bg-gray-50 border-b border-gray-200"
                style={{ gridTemplateColumns: `180px repeat(${monthDays.length}, 1fr)` }}
              >
                <div className="border-r border-gray-200 p-3" />
                {monthDays.map(day => {
                  const todayHL = isToday(day)
                  const weekend = isWeekend(day)
                  return (
                    <div
                      key={format(day, 'yyyy-MM-dd')}
                      className={`border-r border-gray-200 p-2 text-center ${todayHL ? 'bg-[#1a5c3a]/8' : ''}`}
                    >
                      <div className={`text-[10px] font-medium uppercase tracking-wide ${weekend ? 'text-gray-300' : 'text-gray-500'}`}>
                        {format(day, 'EEE', { locale: dfLocale }).slice(0, 2)}
                      </div>
                      <div className={`text-sm font-bold mt-0.5 leading-none ${
                        todayHL
                          ? 'text-white bg-[#1a5c3a] w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs'
                          : weekend ? 'text-gray-300' : 'text-gray-800'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Rows */}
              {staff.map(emp => (
                <div
                  key={emp.user_id}
                  className="grid border-b border-gray-100 last:border-0 hover:bg-gray-50/40 transition-colors"
                  style={{ gridTemplateColumns: `180px repeat(${monthDays.length}, 1fr)` }}
                >
                  <div className="border-r border-gray-200 p-3 flex items-center gap-2 bg-white sticky left-0 z-10">
                    <div className="h-8 w-8 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1a5c3a] uppercase">
                      {emp.full_name.slice(0, 2)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-gray-800 truncate">{emp.full_name}</p>
                      {emp.position && <p className="text-[10px] text-gray-400 truncate">{emp.position}</p>}
                    </div>
                  </div>
                  {monthDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const entry = getEntry(emp.dates, dateStr)
                    const todayHL = isToday(day)
                    const weekend = isWeekend(day)
                    return (
                      <div
                        key={dateStr}
                        className={`border-r border-gray-200 p-1 flex items-center justify-center min-h-[64px] ${
                          todayHL ? 'bg-[#1a5c3a]/5' : weekend ? 'bg-gray-50/60' : ''
                        }`}
                        title={entry
                          ? `${emp.full_name}: ${statusTooltip[entry.status]}${entry.from_time ? ` (${entry.from_time.slice(0,5)}–${entry.to_time?.slice(0,5)})` : ''}`
                          : undefined}
                      >
                        {entry ? (
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-medium leading-tight text-center ${
                            entry.status === 'available'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : entry.status === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {entry.status === 'available'
                              ? t('availability.allDay')
                              : entry.status === 'partial'
                              ? `${entry.from_time?.slice(0,5)}–${entry.to_time?.slice(0,5)}`
                              : t('availability.notAvailable')}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs select-none">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> {t('availability.allDay')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> {t('availability.partialShort')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> {t('availability.notAvailable')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-100 inline-block" /> {t('availability.noData')}</span>
        </div>
      </div>
    </div>
  )
}
