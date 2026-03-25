'use client'

import { useState } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { hu } from 'date-fns/locale'
import { Calendar, ArrowLeftRight, Clock } from 'lucide-react'
import { ShiftWithAssignee, SHIFT_STATUS_LABELS, SHIFT_STATUS_COLORS } from '@/types'
import { requestSwap } from '@/app/actions/schedule'

interface Props {
  shifts: ShiftWithAssignee[]
  currentUserId: string
  weekStart: string
}

export function EmployeeScheduleView({ shifts: initialShifts, currentUserId }: Props) {
  const [shifts, setShifts] = useState(initialShifts)
  const [loadingSwap, setLoadingSwap] = useState<string | null>(null)
  const [swapMsg, setSwapMsg] = useState<string | null>(null)

  async function handleSwapRequest(shiftId: string) {
    setLoadingSwap(shiftId)
    setSwapMsg(null)
    const result = await requestSwap(shiftId)
    setLoadingSwap(null)
    if (result.error) {
      setSwapMsg(`Hiba: ${result.error}`)
    } else {
      setSwapMsg('Csereigény elküldve! A vezető értesítést kap.')
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, status: 'swappable' } : s))
    }
  }

  // Nap szerint csoportosítva (lista nézethez)
  const groupedByDay = shifts.reduce((acc, shift) => {
    const dayKey = shift.start_time.slice(0, 10)
    if (!acc[dayKey]) acc[dayKey] = []
    acc[dayKey].push(shift)
    return acc
  }, {} as Record<string, ShiftWithAssignee[]>)

  const sortedDays = Object.keys(groupedByDay).sort()

  return (
    <div>
      {/* Visszajelzés */}
      {swapMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          swapMsg.startsWith('Hiba') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-[#1a5c3a]'
        }`}>
          {swapMsg}
        </div>
      )}

      {shifts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nincs beosztott műszakod ezen a héten</p>
        </div>
      )}

      {sortedDays.map(dayKey => {
        const dayShifts = groupedByDay[dayKey]
        const date = parseISO(dayKey)
        const todayHL = isToday(date)

        return (
          <div key={dayKey} className="mb-4">
            <div className={`flex items-center gap-2 mb-2 ${todayHL ? 'text-[#1a5c3a]' : 'text-gray-700'}`}>
              <span className="text-sm font-semibold">
                {format(date, 'EEEE, MMMM d.', { locale: hu })}
              </span>
              {todayHL && (
                <span className="text-xs bg-[#1a5c3a] text-white px-2 py-0.5 rounded-full">Ma</span>
              )}
            </div>

            <div className="space-y-2">
              {dayShifts.map(shift => (
                <div
                  key={shift.id}
                  className={`bg-white border rounded-xl p-4 flex items-center justify-between ${
                    shift.status === 'swappable' ? 'border-[#d4a017]/40' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-sm">
                        {format(parseISO(shift.start_time), 'HH:mm')}–{format(parseISO(shift.end_time), 'HH:mm')}
                      </span>
                    </div>
                    {shift.required_position && (
                      <span className="text-sm text-gray-500">{shift.required_position}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SHIFT_STATUS_COLORS[shift.status]}`}>
                      {SHIFT_STATUS_LABELS[shift.status]}
                    </span>
                  </div>

                  {shift.status === 'published' && (
                    <button
                      onClick={() => handleSwapRequest(shift.id)}
                      disabled={loadingSwap === shift.id}
                      className="flex items-center gap-1.5 text-sm text-[#d4a017] hover:text-[#b8871a] font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingSwap === shift.id ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <ArrowLeftRight className="h-4 w-4" />
                      )}
                      Cserét kérek
                    </button>
                  )}

                  {shift.status === 'swappable' && (
                    <span className="text-xs text-[#d4a017] font-medium">Csereigény folyamatban</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
