'use client'

import { useState, useTransition } from 'react'
import { getClockEntries } from '@/app/actions/attendance'
import { format, differenceInMinutes } from 'date-fns'
import type { ClockEntry } from '@/types'
import { Timer } from 'lucide-react'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  initialEntries: ClockEntry[]
  initialDate: string
  employeeNames: Record<string, string>
}

function formatDuration(clockInAt: string, clockOutAt: string | null): string {
  if (!clockOutAt) return '–'
  const mins = differenceInMinutes(new Date(clockOutAt), new Date(clockInAt))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}ó ${m}p`
  return `${m}p`
}

export function ClockInLogTab({ initialEntries, initialDate, employeeNames }: Props) {
  const { t } = useTranslation()
  const [date, setDate] = useState(initialDate)
  const [entries, setEntries] = useState<ClockEntry[]>(initialEntries)
  const [isPending, startTransition] = useTransition()

  function handleDateChange(val: string) {
    if (!val) return
    setDate(val)
    startTransition(async () => {
      const res = await getClockEntries({ date: val })
      setEntries(res)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500 flex-shrink-0">{t('log.selectDay')}</label>
        <input
          type="date"
          value={date}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={e => handleDateChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
        />
        {entries.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {entries.length} {t('log.events')}
          </span>
        )}
      </div>

      <div className={`transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Timer className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t('log.noActivity')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('attendance.colName')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('attendance.colClockIn')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('attendance.colClockOut')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('attendance.colDuration')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map(entry => {
                  const name = employeeNames[entry.user_id] ?? entry.user_id.slice(0, 8)
                  const isStillIn = !entry.clock_out_at
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">
                        {format(new Date(entry.clock_in_at), 'HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        {isStillIn ? (
                          <span className="inline-flex items-center gap-1.5 text-[#1a5c3a] text-xs font-medium bg-[#1a5c3a]/10 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1a5c3a] animate-pulse" />
                            {t('attendance.stillInside')}
                          </span>
                        ) : (
                          <span className="text-gray-600 tabular-nums">
                            {format(new Date(entry.clock_out_at!), 'HH:mm')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {formatDuration(entry.clock_in_at, entry.clock_out_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
