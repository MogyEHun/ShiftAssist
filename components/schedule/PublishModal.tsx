'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { CheckCircle, Send } from 'lucide-react'
import { publishShifts } from '@/app/actions/schedule'
import { ShiftWithAssignee } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  draftShifts: ShiftWithAssignee[]
  onClose: () => void
  onPublished: (shiftIds: string[]) => void
}

export function PublishModal({ draftShifts, onClose, onPublished }: Props) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dolgozónkénti csoportosítás
  const byEmployee = draftShifts.reduce<Record<string, { name: string; count: number }>>((acc, s) => {
    const key = s.user_id ?? 'open'
    const name = s.assignee?.full_name ?? 'Szabad műszak'
    acc[key] = { name, count: (acc[key]?.count ?? 0) + 1 }
    return acc
  }, {})

  async function handlePublish() {
    setLoading(true)
    setError(null)
    const ids = draftShifts.map(s => s.id)
    const result = await publishShifts(ids)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onPublished(ids)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center">
            <Send className="h-5 w-5 text-[#1a5c3a]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('schedule.publishShifts')}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('publish.description')} ({draftShifts.length})
            </p>
          </div>
        </div>

        {/* Összesítő lista */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
          {Object.entries(byEmployee).map(([key, { name, count }]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{name}</span>
              <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                {count} {t('nav.schedule').toLowerCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Dátumtartomány */}
        {draftShifts.length > 0 && (
          <p className="text-xs text-gray-400">
            {format(parseISO(draftShifts[0].start_time), 'MMM d.', { locale: dfLocale })}
            {' – '}
            {format(parseISO(draftShifts[draftShifts.length - 1].start_time), 'MMM d.', { locale: dfLocale })}
          </p>
        )}

        {error && (
          <div className="px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1a5c3a] rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {loading ? t('common.saving') : t('schedule.publish')}
          </button>
        </div>
      </div>
    </div>
  )
}
