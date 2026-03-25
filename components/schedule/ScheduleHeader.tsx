'use client'

import { useRouter } from 'next/navigation'
import { format, addWeeks, subWeeks, parseISO, isToday } from 'date-fns'
import { hu } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface Props {
  weekStart: string    // YYYY-MM-DD (hétfő)
  weekDates: Date[]    // 7 nap: hétfő–vasárnap
}

// Magyar naprövidítések
const DAY_SHORTS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']

export function ScheduleHeader({ weekStart, weekDates }: Props) {
  const router = useRouter()

  function navigate(weeks: number) {
    const newDate = weeks > 0
      ? addWeeks(parseISO(weekStart), weeks)
      : subWeeks(parseISO(weekStart), Math.abs(weeks))
    router.push(`/dashboard/schedule?week=${format(newDate, 'yyyy-MM-dd')}`)
  }

  function goToToday() {
    const today = new Date()
    const { startOfWeek } = require('date-fns')
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    router.push(`/dashboard/schedule?week=${format(monday, 'yyyy-MM-dd')}`)
  }

  return (
    <>
      {/* Navigáció sáv – a ScheduleGrid felett renderi */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Előző hét"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Következő hét"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
          Ma
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(weekDates[0], 'MMM d', { locale: hu })}
          {' – '}
          {format(weekDates[6], 'MMM d.', { locale: hu })}
        </span>
      </div>

      {/* Grid fejléc cella: üres + 7 nap */}
      {/* Névoszlop fejléc (üres) */}
      <div className="bg-gray-50 border-b border-r border-gray-200 p-3 sticky left-0 z-10" />

      {/* Naposzlop fejlécek */}
      {weekDates.map((date, idx) => {
        const todayHighlight = isToday(date)
        return (
          <div
            key={idx}
            className={`p-3 border-b border-r border-gray-200 text-center ${
              todayHighlight ? 'bg-[#1a5c3a]/8' : 'bg-gray-50'
            }`}
          >
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {DAY_SHORTS[idx]}
            </div>
            <div
              className={`text-lg font-bold mt-0.5 ${
                todayHighlight
                  ? 'text-[#1a5c3a] bg-[#1a5c3a] text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                  : 'text-gray-800'
              }`}
            >
              {format(date, 'd')}
            </div>
          </div>
        )
      })}
    </>
  )
}
