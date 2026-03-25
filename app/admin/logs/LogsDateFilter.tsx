'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { CalendarDays, X } from 'lucide-react'

export function LogsDateFilter({
  tab,
  from,
  to,
}: {
  tab: string
  from: string
  to: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams, tab]
  )

  const clear = useCallback(() => {
    router.push(`${pathname}?tab=${tab}`)
  }, [router, pathname, tab])

  const hasFilter = from || to

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <CalendarDays className="h-4 w-4" />
        <span>Szűrés:</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Tól</label>
        <input
          type="date"
          value={from}
          onChange={(e) => update('from', e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Ig</label>
        <input
          type="date"
          value={to}
          onChange={(e) => update('to', e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
        />
      </div>
      {hasFilter && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Törlés
        </button>
      )}
    </div>
  )
}
