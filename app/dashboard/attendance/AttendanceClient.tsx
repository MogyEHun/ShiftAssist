'use client'

import { useState, useTransition } from 'react'
import { getClockEntries } from '@/app/actions/attendance'
import { format, differenceInMinutes } from 'date-fns'
import { hu } from 'date-fns/locale'
import type { ClockEntry } from '@/types'
import type { SiteWithCount } from '@/app/actions/sites'

interface Props {
  initialEntries: ClockEntry[]
  initialDate: string
  employeeNames: Record<string, string>  // user_id → full_name
  sites: SiteWithCount[]
  isMultiSite: boolean
  userRole: string
  userSiteId: string | null
}

function formatDuration(clockInAt: string, clockOutAt: string | null): string {
  if (!clockOutAt) return '–'
  const mins = differenceInMinutes(new Date(clockOutAt), new Date(clockInAt))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}ó ${m}p`
  return `${m}p`
}

export function AttendanceClient({ initialEntries, initialDate, employeeNames, sites, isMultiSite, userRole, userSiteId }: Props) {
  const [date, setDate] = useState(initialDate)
  const [siteId, setSiteId] = useState(
    userRole === 'manager' && userSiteId ? userSiteId : ''
  )
  const [entries, setEntries] = useState<ClockEntry[]>(initialEntries)
  const [isPending, startTransition] = useTransition()

  function reload(newDate: string, newSiteId: string) {
    startTransition(async () => {
      const res = await getClockEntries({ date: newDate, siteId: newSiteId || undefined })
      setEntries(res)
    })
  }

  function handleDateChange(val: string) {
    setDate(val)
    reload(val, siteId)
  }

  function handleSiteChange(val: string) {
    setSiteId(val)
    reload(date, val)
  }

  const isManagerOnly = userRole === 'manager'

  return (
    <div>
      {/* Szűrők */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={e => handleDateChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30"
        />
        {isMultiSite && !isManagerOnly && (
          <select
            value={siteId}
            onChange={e => handleSiteChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30"
          >
            <option value="">Összes telephely</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Táblázat */}
      <div className={`transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl border border-gray-200">
            Nincs bejegyzés erre a napra.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Név</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Bejelentkezés</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kijelentkezés</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Időtartam</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Helyszín</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map(entry => {
                  const name = employeeNames[entry.user_id] ?? entry.user_id.slice(0, 8)
                  const isStillIn = !entry.clock_out_at
                  const hasLocation = entry.lat_in != null && entry.lon_in != null
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(new Date(entry.clock_in_at), 'HH:mm', { locale: hu })}
                      </td>
                      <td className="px-4 py-3">
                        {isStillIn ? (
                          <span className="inline-flex items-center gap-1.5 text-[#1a5c3a] text-xs font-medium bg-[#1a5c3a]/10 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1a5c3a] animate-pulse" />
                            Bent van
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {format(new Date(entry.clock_out_at!), 'HH:mm', { locale: hu })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {formatDuration(entry.clock_in_at, entry.clock_out_at)}
                      </td>
                      <td className="px-4 py-3">
                        {hasLocation ? (
                          <a
                            href={`https://maps.google.com/?q=${entry.lat_in},${entry.lon_in}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1a5c3a] hover:underline text-xs flex items-center gap-1"
                          >
                            📍 Térkép
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">–</span>
                        )}
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
