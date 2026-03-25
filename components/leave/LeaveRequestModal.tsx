'use client'

import { useState } from 'react'
import { differenceInCalendarDays, parseISO, format } from 'date-fns'
import { X } from 'lucide-react'
import { LeaveType, LeaveRequest, LEAVE_TYPE_LABELS } from '@/types'
import { createLeaveRequest } from '@/app/actions/leave'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  onSave: (req: LeaveRequest) => void
  onClose: () => void
}

const TYPE_OPTIONS = Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]

export function LeaveRequestModal({ onSave, onClose }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { t } = useTranslation()
  const [type, setType] = useState<LeaveType>('vacation')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const days = startDate && endDate
    ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
    : 0

  async function handleSave() {
    if (!startDate || !endDate) {
      setError('Kérjük add meg a dátumokat')
      return
    }
    if (days <= 0) {
      setError('A befejező dátum nem lehet a kezdő előtt')
      return
    }

    setLoading(true)
    setError(null)

    const result = await createLeaveRequest({
      type,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      onSave(result.data)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fejléc */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{t('leave.request')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Típus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('leave.type')}</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`py-2.5 px-3 text-sm font-medium rounded-lg border transition-all text-left ${
                    type === value
                      ? 'bg-[#1a5c3a] text-white border-[#1a5c3a]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dátumok */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('leave.startDate')}</label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (e.target.value > endDate) setEndDate(e.target.value)
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('leave.endDate')}</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
            </div>
          </div>

          {/* Napszám */}
          {days > 0 && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
              Időtartam: <span className="font-semibold text-gray-800">{days} nap</span>
            </div>
          )}

          {/* Indoklás */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Indoklás <span className="text-gray-400 font-normal">(opcionális)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Pl. nyaralás, orvosi kezelés..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none resize-none"
            />
          </div>
        </div>

        {/* Gombok */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || days <= 0}
            className="px-5 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {t('leave.request')}
          </button>
        </div>
      </div>
    </div>
  )
}
