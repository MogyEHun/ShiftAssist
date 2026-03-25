'use client'

import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isToday, isSameMonth,
  isWithinInterval, parseISO,
} from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LeaveRequest } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  requests: LeaveRequest[]
  isManager: boolean
}

function leaveTypeLabel(type: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    vacation: t('leave.typeVacation'),
    sick: t('leave.typeSick'),
    personal: t('leave.typePersonal'),
    other: t('leave.typeOther'),
  }
  return map[type] ?? type
}

export function LeaveCalendar({ requests, isManager }: Props) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu

  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Generate locale-aware weekday headers (Mon–Sun, starts Monday)
  const weekStart = startOfWeek(new Date(2024, 0, 1), { weekStartsOn: 1 }) // a Monday
  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), 'EEEEEE', { locale: dfLocale })
  )

  function getRequestsForDay(date: Date): LeaveRequest[] {
    return requests.filter((req) => {
      if (!isManager && req.status === 'rejected') return false
      try {
        return isWithinInterval(date, {
          start: parseISO(req.start_date),
          end: parseISO(req.end_date),
        })
      } catch {
        return false
      }
    })
  }

  function getDayBg(dayRequests: LeaveRequest[]): string {
    if (dayRequests.length === 0) return ''
    const hasApproved = dayRequests.some((r) => r.status === 'approved')
    const hasPending = dayRequests.some((r) => r.status === 'pending')
    if (hasApproved) return 'bg-[#1a5c3a]/15'
    if (hasPending) return 'bg-amber-100'
    return 'bg-gray-100'
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let d = calStart
  while (d <= calEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <h3 className="text-base font-semibold text-gray-900">
          {format(currentMonth, locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-gray-500 py-2">
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {days.map((day, idx) => {
          const dayRequests = getRequestsForDay(day)
          const inMonth = isSameMonth(day, currentMonth)
          const todayHL = isToday(day)
          const bgColor = getDayBg(dayRequests)

          return (
            <div
              key={idx}
              className={`bg-white min-h-[80px] p-1.5 ${!inMonth ? 'opacity-40' : ''} ${bgColor}`}
            >
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                todayHL
                  ? 'bg-[#1a5c3a] text-white'
                  : 'text-gray-700'
              }`}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayRequests.slice(0, 3).map((req) => {
                  const color =
                    req.status === 'approved' ? 'bg-[#1a5c3a] text-white' :
                    req.status === 'pending' ? 'bg-amber-400 text-white' :
                    'bg-gray-300 text-gray-600'

                  const name = (req.user as any)?.full_name
                  const typeLabel = leaveTypeLabel(req.type, t)
                  const label = name || typeLabel

                  return (
                    <div
                      key={req.id}
                      className={`text-[10px] px-1 py-0.5 rounded truncate font-medium ${color}`}
                      title={`${label} – ${typeLabel}`}
                    >
                      {label}
                    </div>
                  )
                })}
                {dayRequests.length > 3 && (
                  <div className="text-[10px] text-gray-400 pl-1">
                    +{dayRequests.length - 3} {t('leave.more')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#1a5c3a]" />
          {t('leave.approved')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400" />
          {t('leave.pending')}
        </span>
        {isManager && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-300" />
            {t('leave.rejected')}
          </span>
        )}
      </div>
    </div>
  )
}
