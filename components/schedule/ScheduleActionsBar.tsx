'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Sparkles, Download, Send, PenSquare } from 'lucide-react'
import { createShift } from '@/app/actions/schedule'
import { exportSchedulePDF } from '@/lib/exportSchedulePDF'
import { PublishModal } from './PublishModal'
import { AiScheduleWizard } from './AiScheduleWizard'
import { AiSuggestionBar } from './AiSuggestionBar'
import { AttendanceExportModal } from '@/components/reports/AttendanceExportModal'
import { useTranslation } from '@/components/providers/LanguageProvider'
import type { ShiftWithAssignee, AiShiftSuggestion, LeaveRequest } from '@/types'

interface Props {
  shifts: ShiftWithAssignee[]
  employees: { id: string; full_name: string; position: string | null }[]
  positions?: string[]
  approvedLeaves?: LeaveRequest[]
  isManager: boolean
  weekDates: Date[]
  /** ScheduleGrid passes this to sync its own plannerMode state */
  onPlannerModeChange?: (mode: boolean) => void
  /** ScheduleGrid passes this to handle suggestions via its reducer */
  onAiGenerated?: (suggestions: AiShiftSuggestion[]) => void
  /** ScheduleGrid passes this to dispatch UPDATE_SHIFT optimistically */
  onPublished?: (ids: string[]) => void
}

export function ScheduleActionsBar({
  shifts,
  employees,
  positions = [],
  approvedLeaves = [],
  isManager,
  weekDates,
  onPlannerModeChange,
  onAiGenerated,
  onPublished,
}: Props) {
  const router = useRouter()
  const { t } = useTranslation()

  const [plannerMode, setPlannerMode] = useState(true)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)

  // Standalone AI suggestions (when ScheduleGrid doesn't handle them via reducer)
  const [suggestions, setSuggestions] = useState<AiShiftSuggestion[]>([])
  const [acceptingAll, setAcceptingAll] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('schedule_planner_mode')
    const initial = stored !== '0'
    setPlannerMode(initial)
    onPlannerModeChange?.(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function togglePlannerMode() {
    setPlannerMode(v => {
      const next = !v
      localStorage.setItem('schedule_planner_mode', next ? '1' : '0')
      onPlannerModeChange?.(next)
      return next
    })
  }

  function handleExport() {
    if (weekDates.length === 0) return
    const label = weekDates.length >= 7
      ? `${weekDates[0].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}`
      : weekDates[0].toLocaleDateString('hu-HU', { month: 'long', year: 'numeric' })
    exportSchedulePDF(weekDates, employees, shifts, label, approvedLeaves)
  }

  function handleAiGenerated(sgs: AiShiftSuggestion[]) {
    if (onAiGenerated) {
      onAiGenerated(sgs)
    } else {
      setSuggestions(sgs)
    }
  }

  async function acceptAllSuggestions() {
    if (suggestions.length === 0) return
    setAcceptingAll(true)
    for (const s of suggestions) {
      try {
        await createShift({
          user_id: s.user_id,
          start_time: s.start_time,
          end_time: s.end_time,
          required_position: s.required_position,
          status: 'draft',
          notes: s.notes,
          title: s.required_position ?? 'Műszak',
          type: 'fixed',
        })
      } catch {}
    }
    setSuggestions([])
    setAcceptingAll(false)
    router.refresh()
  }

  const draftShifts = shifts.filter(s => s.status === 'draft')

  return (
    <>
      {/* Standalone AI suggestion bar (for DayView / MonthlyView) */}
      {!onAiGenerated && suggestions.length > 0 && (
        <AiSuggestionBar
          count={suggestions.length}
          accepting={acceptingAll}
          onAcceptAll={acceptAllSuggestions}
          onDismiss={() => setSuggestions([])}
        />
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {isManager && (
          <button
            onClick={togglePlannerMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              plannerMode
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <PenSquare className="h-3.5 w-3.5" />
            {t('schedule.plannerMode')}
          </button>
        )}
        {isManager && (
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={draftShifts.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-[#1a5c3a] rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            {t('schedule.publish')}{draftShifts.length > 0 ? ` (${draftShifts.length})` : ''}
          </button>
        )}
        {isManager && (
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#8a6a0a] bg-[#d4a017]/10 border border-[#d4a017]/40 rounded-lg hover:bg-[#d4a017]/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#d4a017]" />
            {t('schedule.aiWizard')}
          </button>
        )}
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
        <button
          onClick={handleExport}
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          title={t('schedule.exportPdf')}
        >
          <Download className="h-4 w-4 text-gray-500" />
        </button>
        {isManager && (
          <button
            onClick={() => setShowAttendanceModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('schedule.exportAttendance')}
          </button>
        )}
      </div>

      {showPublishModal && (
        <PublishModal
          draftShifts={draftShifts}
          onClose={() => setShowPublishModal(false)}
          onPublished={(ids) => {
            onPublished?.(ids)
            setShowPublishModal(false)
            if (!onPublished) router.refresh()
          }}
        />
      )}

      {showAiModal && (
        <AiScheduleWizard
          onGenerated={handleAiGenerated}
          onClose={() => setShowAiModal(false)}
          positions={Array.from(new Set([
            ...positions,
            ...employees.map(e => e.position).filter((p): p is string => !!p),
          ])).sort()}
          employees={employees.map(e => ({ id: e.id, full_name: e.full_name }))}
          currentWeekStart={weekDates[0] ? format(weekDates[0], 'yyyy-MM-dd') : undefined}
        />
      )}

      {showAttendanceModal && (
        <AttendanceExportModal onClose={() => setShowAttendanceModal(false)} />
      )}
    </>
  )
}
