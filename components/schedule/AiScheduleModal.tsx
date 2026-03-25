'use client'

import { useState } from 'react'
import { X, Sparkles, AlertCircle } from 'lucide-react'
import { AiShiftSuggestion } from '@/types'
import { generateSchedule } from '@/app/actions/ai-schedule'
import { format, startOfWeek, addWeeks } from 'date-fns'

interface Props {
  onGenerated: (suggestions: AiShiftSuggestion[]) => void
  onClose: () => void
  onVacationUsers?: string[]
}

export function AiScheduleModal({ onGenerated, onClose, onVacationUsers }: Props) {
  const nextMonday = format(
    startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  )

  const [weekStart, setWeekStart] = useState(nextMonday)
  const [minStaff, setMinStaff] = useState(2)
  const [openFrom, setOpenFrom] = useState('08:00')
  const [openTo, setOpenTo] = useState('20:00')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateSchedule({
        weekStart,
        minStaffPerDay: minStaff,
        openFrom,
        openTo,
        note: note || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      onGenerated(result.data ?? [])
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Hiba történt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Fejléc */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#d4a017]" />
            <h2 className="text-lg font-semibold text-gray-900">AI Beosztástervező</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Hét kezdete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hét kezdete (hétfő)</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
            />
          </div>

          {/* Nyitvatartás */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nyitás</label>
              <input
                type="time"
                value={openFrom}
                onChange={(e) => setOpenFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Zárás</label>
              <input
                type="time"
                value={openTo}
                onChange={(e) => setOpenTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
            </div>
          </div>

          {/* Min. dolgozó/nap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Minimum dolgozó/nap: <span className="text-[#1a5c3a] font-semibold">{minStaff}</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={minStaff}
              onChange={(e) => setMinStaff(Number(e.target.value))}
              className="w-full accent-[#1a5c3a]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span><span>10</span>
            </div>
          </div>

          {/* Megjegyzés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Megjegyzés (opcionális)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="pl. Hétvégén emelt létszám szükséges..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Mégse
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#d4a017] rounded-xl hover:bg-[#b8891a] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generálás...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generálás
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
