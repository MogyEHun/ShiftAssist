'use client'

import { useDroppable } from '@dnd-kit/core'
import { isToday, parseISO } from 'date-fns'
import { Plus, UmbrellaOff, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ShiftWithAssignee, LeaveRequest, Station } from '@/types'
import { ShiftCard } from './ShiftCard'

interface Props {
  droppableId: string          // "{userId}::{YYYY-MM-DD}"
  dateISO: string              // YYYY-MM-DD
  shifts: ShiftWithAssignee[]
  role: string
  currentUserId: string
  onEmptyCellClick: (userId: string, dateISO: string) => void
  onEditShift: (shift: ShiftWithAssignee) => void
  onSwapRequest?: (shiftId: string) => void
  leaveRequest?: LeaveRequest | null
  employeePosition?: string
  availabilityConflict?: boolean
  stations?: Station[]
}

export function ScheduleCell({
  droppableId,
  dateISO,
  shifts,
  role,
  currentUserId,
  onEmptyCellClick,
  onEditShift,
  onSwapRequest,
  leaveRequest,
  employeePosition,
  availabilityConflict = false,
  stations = [],
}: Props) {
  const [userId] = droppableId.split('::')
  const isManager = ['owner', 'admin', 'manager'].includes(role)
  const today = isToday(parseISO(dateISO))
  const router = useRouter()

  const { isOver, setNodeRef } = useDroppable({ id: droppableId })

  const isEmpty = shifts.length === 0 && !leaveRequest
  const hasOvernight = shifts.some(s => s.end_time.slice(0, 10) !== dateISO)

  const statusOrder: Record<string, number> = { published: 0, swappable: 1, draft: 2, open: 3 }
  const sortedShifts = [...shifts].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))
  const hasMixedStatuses = shifts.some(s => s.status === 'published') && shifts.some(s => s.status === 'draft')

  return (
    <div
      ref={setNodeRef}
      className={`
        h-[96px] p-1.5 flex flex-col relative transition-colors duration-100
        ${hasOvernight ? 'overflow-visible' : 'overflow-hidden'}
        ${today ? 'bg-[#1a5c3a]/5' : 'bg-white'}
        ${isOver ? 'bg-[#d4a017]/15 ring-2 ring-inset ring-[#d4a017]' : ''}
      `}
      onClick={() => {
        if (isManager && isEmpty) {
          onEmptyCellClick(userId, dateISO)
        }
      }}
    >
      {/* Ütközés badge – ha van egyszerre draft és published */}
      {hasMixedStatuses && (
        <div className="absolute top-0.5 left-0.5 z-30 flex items-center gap-0.5 bg-amber-100 border border-amber-300 rounded px-1 py-0.5">
          <AlertTriangle className="h-2.5 w-2.5 text-amber-600 flex-shrink-0" />
          <span className="text-[9px] font-semibold text-amber-700 leading-none">Ütközés</span>
        </div>
      )}

      {/* Kártyák konténer – flex-1 tölti a cellát */}
      <div className={`flex-1 min-h-0 flex flex-col gap-1 ${hasOvernight ? 'overflow-visible' : ''} ${hasMixedStatuses ? 'mt-4' : ''}`}>
        {/* Szabadság kártya */}
        {leaveRequest && (
          <div
            className="flex-1 min-h-0 rounded-lg border border-[#d4a017]/50 bg-[#d4a017]/10 select-none cursor-pointer hover:bg-[#d4a017]/20 transition-colors flex flex-col items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/dashboard/leave?userId=${userId}`)
            }}
          >
            <div className="flex items-center gap-1 font-semibold text-[#b8871a] text-[10px] leading-tight">
              <UmbrellaOff className="h-3 w-3 flex-shrink-0" />
              Szabadság
            </div>
          </div>
        )}

        {/* Műszak kártyák – published először */}
        {sortedShifts.map((shift) => {
          const isOvernightShift = shift.end_time.slice(0, 10) !== dateISO
          return (
            <div
              key={shift.id}
              className={`flex-1 min-h-0 ${isOvernightShift ? 'relative z-20' : ''}`}
              style={isOvernightShift ? { width: 'calc(200% + 13px)' } : undefined}
            >
              <ShiftCard
                shift={shift}
                role={role}
                currentUserId={currentUserId}
                onEdit={onEditShift}
                onSwapRequest={onSwapRequest}
                employeePosition={employeePosition}
                availabilityConflict={availabilityConflict}
                station={stations.find(s => s.id === shift.station_id) ?? null}
              />
            </div>
          )
        })}
      </div>

      {/* "+" gomb üres cellán (manager) */}
      {isManager && isEmpty && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer group">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[#1a5c3a]/10 transition-colors">
            <Plus className="h-4 w-4 text-gray-400 group-hover:text-[#1a5c3a]" />
          </div>
        </div>
      )}

      {/* "+" gomb nem üres cellán (manager) – overlay */}
      {isManager && !isEmpty && (
        <button
          className="absolute bottom-0.5 right-0.5 flex items-center justify-center w-5 h-5 rounded-full opacity-0 hover:opacity-100 bg-white/80 hover:bg-white shadow-sm transition-opacity z-20"
          onClick={(e) => {
            e.stopPropagation()
            onEmptyCellClick(userId, dateISO)
          }}
        >
          <Plus className="h-3 w-3 text-gray-500" />
        </button>
      )}
    </div>
  )
}
