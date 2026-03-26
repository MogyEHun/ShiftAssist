'use client'

import { useState } from 'react'
import { format, addWeeks, parseISO } from 'date-fns'
import { Copy } from 'lucide-react'
import { copyWeekShifts } from '@/app/actions/schedule'

interface Props {
  weekStart: string
}

export function CopyWeekButton({ weekStart }: Props) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  const nextWeek = format(addWeeks(parseISO(weekStart), 1), 'yyyy-MM-dd')

  async function handleCopy() {
    setPending(true)
    setMessage(null)
    const result = await copyWeekShifts(weekStart, nextWeek)
    setPending(false)
    setConfirm(false)
    if (result.error) {
      setMessage(`Hiba: ${result.error}`)
    } else {
      setMessage(result.count > 0 ? `${result.count} műszak másolva a következő hétre (vázlat)` : 'Nincs másolható műszak ezen a héten.')
    }
    setTimeout(() => setMessage(null), 4000)
  }

  return (
    <div className="relative flex items-center gap-2">
      {confirm ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm">
          <span className="text-amber-800">Átmásolja az előző hét beosztását erre a hétre (vázlatként)?</span>
          <button
            onClick={handleCopy}
            disabled={pending}
            className="px-3 py-1 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#164d30] disabled:opacity-60"
          >
            {pending ? 'Másolás...' : 'Igen, másolás'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >
            Mégse
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Copy className="h-4 w-4" />
          Hét másolása
        </button>
      )}
      {message && (
        <span className="text-sm text-gray-600 ml-1">{message}</span>
      )}
    </div>
  )
}
