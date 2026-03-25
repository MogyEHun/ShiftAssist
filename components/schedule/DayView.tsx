'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, parseISO, isToday, startOfWeek } from 'date-fns'
import { hu } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Clock, MoveRight, PenSquare } from 'lucide-react'
import { WeeklyScheduleData, ShiftWithAssignee } from '@/types'
import { ShiftModal } from './ShiftModal'
import { ScheduleActionsBar } from './ScheduleActionsBar'
import { createShift } from '@/app/actions/schedule'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  scheduleData: WeeklyScheduleData
  currentUserId: string
  userRole: string
  dateISO: string   // YYYY-MM-DD
}

function shiftDuration(shift: ShiftWithAssignee): string {
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const mins = Math.max(0, (end.getTime() - start.getTime()) / 60000 - (shift.break_minutes ?? 0))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}ó ${m}p` : `${h}ó`
}

function isOvernight(shift: ShiftWithAssignee): boolean {
  return shift.start_time.slice(0, 10) !== shift.end_time.slice(0, 10)
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 border-gray-300 text-gray-700',
  published: 'bg-[#1a5c3a]/8 border-[#1a5c3a]/30 text-[#1a5c3a]',
  confirmed: 'bg-blue-50 border-blue-200 text-blue-700',
}

export function DayView({ scheduleData, currentUserId, userRole, dateISO }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const isManager = ['owner', 'admin', 'manager'].includes(userRole)
  const date = parseISO(dateISO)
  const [plannerMode, setPlannerMode] = useState(false)

  const [modal, setModal] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    shift?: ShiftWithAssignee
    prefilledUserId?: string
    prefilledDate?: string
  }>({ open: false, mode: 'create' })

  function navigate(delta: number) {
    const newDate = delta > 0 ? addDays(date, 1) : subDays(date, 1)
    router.push(`/dashboard/schedule?view=day&date=${format(newDate, 'yyyy-MM-dd')}`)
  }

  function openCreate(userId: string) {
    setModal({ open: true, mode: 'create', prefilledUserId: userId, prefilledDate: dateISO })
  }

  function openEdit(shift: ShiftWithAssignee) {
    setModal({ open: true, mode: 'edit', shift })
  }

  const dayShifts = scheduleData.shifts.filter(s => s.start_time.slice(0, 10) === dateISO)
  const todayHL = isToday(date)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: navigáció + action gombok egy sorban */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => router.push(`/dashboard/schedule?view=day&date=${format(new Date(), 'yyyy-MM-dd')}`)}
            className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            {t('schedule.today')}
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <span className={`text-sm font-semibold ${todayHL ? 'text-[#1a5c3a]' : 'text-gray-800'}`}>
          {format(date, 'yyyy. MMMM d.', { locale: hu })}
          <span className="ml-2 font-normal text-gray-400">{format(date, 'EEEE', { locale: hu })}</span>
        </span>
        {isManager && (
          <div className="ml-auto">
            <ScheduleActionsBar
              shifts={scheduleData.shifts}
              employees={scheduleData.employees}
              positions={scheduleData.positions?.map(p => p.name) ?? []}
              approvedLeaves={scheduleData.approvedLeaves}
              isManager={isManager}
              weekDates={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date, { weekStartsOn: 1 }), i))}
              onPlannerModeChange={setPlannerMode}
            />
          </div>
        )}
      </div>

      {/* Tervező mód banner */}
      {plannerMode && isManager && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <PenSquare className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t('schedule.plannerBanner')}</span>
        </div>
      )}

      {/* Műszakszám */}
      <div className="px-1 mb-2 text-sm text-gray-500">
        <strong className="text-gray-700">{dayShifts.length}</strong> {t('schedule.shiftsUnit')}
      </div>

      {/* Dolgozó lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 overflow-y-auto">
        {scheduleData.employees.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nincs aktív dolgozó</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-52">
                  Dolgozó
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Műszak(ok)
                </th>
                {isManager && (
                  <th className="px-4 py-3 w-12" />
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scheduleData.employees.map((employee) => {
                const empShifts = dayShifts.filter(s => s.user_id === employee.id)
                const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1
                const avail = scheduleData.availabilities.find(
                  a => a.user_id === employee.id && a.day_of_week === dayOfWeek
                )
                const isUnavailable = avail?.note === 'unavailable'

                return (
                  <tr
                    key={employee.id}
                    className={`hover:bg-gray-50 transition-colors ${isUnavailable && empShifts.length > 0 ? 'bg-orange-50' : ''}`}
                  >
                    {/* Névoszlop */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1a5c3a] uppercase">
                          {employee.full_name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{employee.full_name}</div>
                          {employee.position && (
                            <div className="text-xs text-gray-400">{employee.position}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Műszak cellák */}
                    <td className="px-4 py-3">
                      {empShifts.length === 0 ? (
                        <span className="text-xs text-gray-300 italic">
                          {isUnavailable ? 'Nem elérhető' : 'Szabad nap'}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {empShifts.map(shift => (
                            <button
                              key={shift.id}
                              onClick={() => isManager && openEdit(shift)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                STATUS_COLORS[shift.status] ?? STATUS_COLORS.draft
                              } ${isManager ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'}`}
                            >
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span>
                                {format(parseISO(shift.start_time), 'HH:mm')}–
                                {format(parseISO(shift.end_time), 'HH:mm')}
                              </span>
                              {isOvernight(shift) && (
                                <span title="Éjszakán átnyúló">
                                  <MoveRight className="h-3 w-3 text-blue-400" />
                                </span>
                              )}
                              {shift.title && (
                                <span className="text-gray-400">· {shift.title}</span>
                              )}
                              <span className="text-gray-400">({shiftDuration(shift)})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* + gomb */}
                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openCreate(employee.id)}
                          className="p-1.5 rounded-lg hover:bg-[#1a5c3a]/10 text-gray-400 hover:text-[#1a5c3a] transition-colors"
                          title="Műszak hozzáadása"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Shift modal */}
      {modal.open && (
        <ShiftModal
          mode={modal.mode}
          shift={modal.shift}
          prefilledUserId={modal.prefilledUserId}
          prefilledDate={modal.prefilledDate}
          employees={scheduleData.employees}
          onSave={() => { setModal({ open: false, mode: 'create' }); router.refresh() }}
          onDelete={() => { setModal({ open: false, mode: 'create' }); router.refresh() }}
          onClose={() => setModal({ open: false, mode: 'create' })}
        />
      )}
    </div>
  )
}
