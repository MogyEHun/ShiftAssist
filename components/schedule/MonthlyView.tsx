'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, addMonths, subMonths, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, isWeekend, startOfWeek, addDays,
} from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, PenSquare } from 'lucide-react'
import { ShiftWithAssignee } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'
import { ScheduleActionsBar } from './ScheduleActionsBar'

interface Props {
  shifts: ShiftWithAssignee[]
  employees: { id: string; full_name: string; position: string | null }[]
  monthStart: string
  userRole?: string
}

const STATUS_COLOR: Record<string, string> = {
  published: 'bg-green-50 text-green-800 border-green-200',
  draft:     'bg-gray-50 text-gray-500 border-gray-200',
  swap_requested: 'bg-amber-50 text-amber-800 border-amber-200',
}

export function MonthlyView({ shifts, employees, monthStart, userRole = 'employee' }: Props) {
  const router = useRouter()
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu
  const month = parseISO(monthStart)
  const isManager = ['owner', 'admin', 'manager'].includes(userRole)
  const [plannerMode, setPlannerMode] = useState(false)

  function navigate(delta: number) {
    const newMonth = delta > 0 ? addMonths(month, 1) : subMonths(month, 1)
    router.push(`/dashboard/schedule?view=month&month=${format(newMonth, 'yyyy-MM-dd')}`)
  }

  const monthDays = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })

  const activeEmployees = employees

  const totalShifts = shifts.length
  const colWidth = 72

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: navigáció + action gombok egy sorban */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => router.push(`/dashboard/schedule?view=month&month=${format(new Date(), 'yyyy-MM-01')}`)}
            className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            {t('schedule.today')}
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <span className="text-sm font-semibold text-gray-800 capitalize">
          {format(month, locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })}
        </span>
        {isManager && (
          <div className="ml-auto">
            <ScheduleActionsBar
              shifts={shifts}
              employees={employees}
              isManager={true}
              weekDates={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), i))}
              onPlannerModeChange={setPlannerMode}
            />
          </div>
        )}
      </div>

      {/* Tervező mód banner */}
      {plannerMode && isManager && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex-shrink-0">
          <PenSquare className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t('schedule.plannerBanner')}</span>
        </div>
      )}

      {/* Műszakszám */}
      <div className="px-1 mb-2 text-sm text-gray-500 flex-shrink-0">
        <strong className="text-gray-700">{totalShifts}</strong> {t('schedule.shiftsUnit')}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto flex-1">
        <div style={{ minWidth: `${180 + monthDays.length * colWidth}px` }}>

          {/* Fejléc sor */}
          <div
            className="grid sticky top-0 z-20 bg-gray-50 border-b border-gray-200"
            style={{ gridTemplateColumns: `180px repeat(${monthDays.length}, ${colWidth}px)` }}
          >
            <div className="border-r border-gray-200 p-3" />
            {monthDays.map(day => {
              const todayHL = isToday(day)
              const weekend = isWeekend(day)
              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`border-r border-gray-200 p-2 text-center last:border-r-0 ${todayHL ? 'bg-[#1a5c3a]/8' : ''}`}
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

          {/* Üres állapot */}
          {activeEmployees.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-400">
              {t('schedule.noShiftsMonth')}
            </div>
          )}

          {/* Dolgozó sorok */}
          {activeEmployees.map(employee => (
            <div
              key={employee.id}
              className="grid border-b border-gray-100 last:border-0 hover:bg-gray-50/40 transition-colors"
              style={{ gridTemplateColumns: `180px repeat(${monthDays.length}, ${colWidth}px)` }}
            >
              {/* Névoszlop */}
              <div className="border-r border-gray-200 p-3 flex items-center gap-2 bg-white sticky left-0 z-10">
                <div className="h-8 w-8 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1a5c3a] uppercase">
                  {employee.full_name.slice(0, 2)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-800 truncate">{employee.full_name}</p>
                  {employee.position && (
                    <p className="text-[10px] text-gray-400 truncate">{employee.position}</p>
                  )}
                </div>
              </div>

              {/* Nap cellák */}
              {monthDays.map(day => {
                const dateISO = format(day, 'yyyy-MM-dd')
                const todayHL = isToday(day)
                const weekend = isWeekend(day)
                const cellShifts = shifts.filter(
                  s => s.user_id === employee.id && s.start_time.slice(0, 10) === dateISO
                )
                return (
                  <div
                    key={dateISO}
                    className={`border-r border-gray-200 last:border-r-0 p-1 min-h-[56px] flex flex-col gap-0.5 justify-center ${
                      todayHL ? 'bg-[#1a5c3a]/5' : weekend ? 'bg-gray-50/60' : ''
                    } ${cellShifts.length > 0 ? 'cursor-pointer' : ''}`}
                    onClick={() => cellShifts.length > 0 && router.push(`/dashboard/schedule?view=day&date=${dateISO}`)}
                    title={dateISO}
                  >
                    {cellShifts.length === 0 ? (
                      <span className="text-gray-200 text-xs text-center select-none block">·</span>
                    ) : (
                      cellShifts.map(s => {
                        const colorClass = STATUS_COLOR[s.status] ?? STATUS_COLOR.published
                        const startTime = format(parseISO(s.start_time), 'HH:mm')
                        const endTime = format(parseISO(s.end_time), 'HH:mm')
                        return (
                          <div
                            key={s.id}
                            className={`text-[10px] font-medium px-1 py-0.5 rounded border leading-tight truncate ${colorClass}`}
                            title={`${startTime}–${endTime}${s.title ? ' · ' + s.title : ''}`}
                          >
                            {startTime}–{endTime}
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Jelmagyarázat */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block" /> {t('schedule.published')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-50 border border-gray-200 inline-block" /> {t('schedule.draft')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block" /> {t('schedule.swappable')}
        </span>
      </div>
    </div>
  )
}
