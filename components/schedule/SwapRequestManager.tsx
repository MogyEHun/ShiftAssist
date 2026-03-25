'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { hu } from 'date-fns/locale'
import { Check, X, MessageSquare } from 'lucide-react'
import { resolveSwap } from '@/app/actions/schedule'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface ConfirmState {
  swapId: string
  approved: boolean
}

interface SwapItem {
  id: string
  shift: { start_time: string; end_time: string; title: string } | null
  requester: { id: string; full_name: string; position: string | null; email: string } | null
  target_user: { id: string; full_name: string; position: string | null; email: string } | null
  created_at: string
}

interface Props {
  swapRequests: SwapItem[]
}

export function SwapRequestManager({ swapRequests: initial }: Props) {
  const { t } = useTranslation()
  const [requests, setRequests] = useState(initial)
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  async function handle(id: string, approved: boolean) {
    setLoadingId(id)
    const result = await resolveSwap(id, approved, noteMap[id] || undefined)
    setLoadingId(null)

    if (result.error) {
      setMessage({ id, text: result.error, ok: false })
    } else {
      setMessage({ id, text: approved ? 'Jóváhagyva! Emailek elküldve.' : 'Elutasítva.', ok: true })
      setRequests(prev => prev.filter(r => r.id !== id))
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Check className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Nincs függőben lévő csereigény</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {confirm.approved ? 'Jóváhagyás megerősítése' : 'Elutasítás megerősítése'}
            </p>
            <p className="text-sm text-gray-500 mb-5">
              {confirm.approved
                ? 'Biztosan jóváhagyod a csereigényt? A dolgozók értesítést kapnak.'
                : 'Biztosan elutasítod a csereigényt?'}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                onClick={() => setConfirm(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${confirm.approved ? 'bg-[#1a5c3a] hover:bg-[#15472e]' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={() => { const c = confirm; setConfirm(null); handle(c.swapId, c.approved) }}
              >
                {confirm.approved ? 'Igen, jóváhagyom' : 'Igen, elutasítom'}
              </button>
            </div>
          </div>
        </div>
      )}
      {requests.map(req => (
        <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Részletek */}
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">
                {req.requester?.full_name ?? 'Ismeretlen'} ↔ {req.target_user?.full_name ?? 'Ismeretlen'}
              </div>
              {req.shift && (
                <div className="text-sm text-gray-500">
                  Műszak:{' '}
                  <span className="font-medium text-gray-700">
                    {format(parseISO(req.shift.start_time), 'MMMM d. (EEE) HH:mm', { locale: hu })}
                    {' – '}
                    {format(parseISO(req.shift.end_time), 'HH:mm')}
                  </span>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                Kérve: {format(parseISO(req.created_at), 'MMM d. HH:mm', { locale: hu })}
              </div>
            </div>

            {/* Akciók */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setConfirm({ swapId: req.id, approved: true })}
                disabled={loadingId === req.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Jóváhagyás
              </button>
              <button
                onClick={() => setConfirm({ swapId: req.id, approved: false })}
                disabled={loadingId === req.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Elutasítás
              </button>
            </div>
          </div>

          {/* Megjegyzés mező */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <MessageSquare className="h-3 w-3" />
              Megjegyzés a dolgozóknak (opcionális)
            </div>
            <input
              type="text"
              value={noteMap[req.id] ?? ''}
              onChange={e => setNoteMap(prev => ({ ...prev, [req.id]: e.target.value }))}
              placeholder="Pl. Következő héten pótolni kell..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
            />
          </div>

          {/* Visszajelzés */}
          {message?.id === req.id && (
            <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
              message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
