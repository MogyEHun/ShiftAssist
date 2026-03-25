'use client'

import { useState } from 'react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { Check, X, MessageSquare, Calendar, Clock } from 'lucide-react'
import { LeaveRequest, LEAVE_STATUS_COLORS } from '@/types'
import { resolveLeaveRequest } from '@/app/actions/leave'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  requests: LeaveRequest[]
  isManager: boolean
  onUpdate: (id: string, status: 'approved' | 'rejected', note?: string) => void
  hideUserName?: boolean
}

function leaveTypeLabel(type: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    vacation: t('leave.typeVacation'),
    sick: t('leave.typeSick'),
    personal: t('leave.typePersonal'),
    other: t('leave.typeOther'),
  }
  return map[type] ?? type
}

function leaveStatusLabel(status: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    pending: t('leave.pending'),
    approved: t('leave.approved'),
    rejected: t('leave.rejected'),
  }
  return map[status] ?? status
}

export function LeaveList({ requests, isManager, onUpdate, hideUserName = false }: Props) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu

  const [noteMap, setNoteMap] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; text: string; ok: boolean } | null>(null)

  async function handle(id: string, approved: boolean) {
    setLoadingId(id)
    const result = await resolveLeaveRequest(id, approved, noteMap[id] || undefined)
    setLoadingId(null)

    if (result.error) {
      setFeedback({ id, text: result.error, ok: false })
    } else {
      setFeedback({ id, text: approved ? t('leave.approveSuccess') : t('leave.rejectSuccess'), ok: true })
      onUpdate(id, approved ? 'approved' : 'rejected', noteMap[id])
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{t('leave.noRequests')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const days = differenceInCalendarDays(parseISO(req.end_date), parseISO(req.start_date)) + 1
        const isPending = req.status === 'pending'
        const startStr = format(parseISO(req.start_date), locale === 'en' ? 'MMM d, yyyy' : 'yyyy. MMM d.', { locale: dfLocale })
        const endStr = format(parseISO(req.end_date), 'MMM d.', { locale: dfLocale })

        return (
          <div
            key={req.id}
            className={`bg-white rounded-xl border p-4 ${
              isPending ? 'border-amber-200 border-l-4 border-l-amber-400' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {isManager && !hideUserName && req.user && (
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    {(req.user as any).full_name}
                    {(req.user as any).position && (
                      <span className="text-gray-400 font-normal ml-1.5">· {(req.user as any).position}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">
                    {leaveTypeLabel(req.type, t)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_STATUS_COLORS[req.status]}`}>
                    {leaveStatusLabel(req.status, t)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  {startStr} – {endStr}
                  <span className="text-gray-400">({days} {t('leave.days')})</span>
                </div>

                {req.reason && (
                  <p className="mt-1.5 text-xs text-gray-400 italic">„{req.reason}"</p>
                )}

                {req.manager_note && (
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="font-medium">{t('leave.managerLabel')}:</span> {req.manager_note}
                  </p>
                )}
              </div>

              {isManager && isPending && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handle(req.id, true)}
                    disabled={loadingId === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {t('leave.approve')}
                  </button>
                  <button
                    onClick={() => handle(req.id, false)}
                    disabled={loadingId === req.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    {t('leave.reject')}
                  </button>
                  <button
                    onClick={() => setExpandedNote(expandedNote === req.id ? null : req.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    title={t('leave.addNote')}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {isManager && isPending && expandedNote === req.id && (
              <div className="mt-3">
                <input
                  type="text"
                  value={noteMap[req.id] ?? ''}
                  onChange={(e) => setNoteMap((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder={t('leave.notePlaceholder')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                />
              </div>
            )}

            {feedback?.id === req.id && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                feedback.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {feedback.text}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
