'use client'

import { format, parseISO } from 'date-fns'
import { ShiftWithAssignee, SHIFT_STATUS_LABELS } from '@/types'

interface Props {
  shift: ShiftWithAssignee
}

export function DragOverlayCard({ shift }: Props) {
  const startStr = format(parseISO(shift.start_time), 'HH:mm')
  const endStr = format(parseISO(shift.end_time), 'HH:mm')

  return (
    <div className="bg-white rounded-lg border-2 border-[#1a5c3a] shadow-2xl p-2 w-36 rotate-2 opacity-95">
      <div className="font-bold text-xs text-gray-800">{startStr}–{endStr}</div>
      {shift.required_position && (
        <div className="text-[11px] text-gray-500 mt-0.5 truncate">{shift.required_position}</div>
      )}
      <div className="text-[10px] text-[#1a5c3a] font-medium mt-1">
        {SHIFT_STATUS_LABELS[shift.status]}
      </div>
      {shift.assignee && (
        <div className="text-[10px] text-gray-400 mt-0.5 truncate">{shift.assignee.full_name}</div>
      )}
    </div>
  )
}
