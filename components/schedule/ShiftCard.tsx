'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format, parseISO } from 'date-fns'
import { ArrowLeftRight, MoveRight, MapPin } from 'lucide-react'
import { ShiftWithAssignee, SHIFT_STATUS_COLORS, Station } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  shift: ShiftWithAssignee
  role: string
  currentUserId: string
  onEdit: (shift: ShiftWithAssignee) => void
  onSwapRequest?: (shiftId: string) => void
  isDragOverlay?: boolean   // Drag közben lebegő kártya
  isSuggestion?: boolean    // AI javaslat kártya
  employeePosition?: string // Dolgozó pozíciója (pozíció-alapú szín)
  availabilityConflict?: boolean // Elérhetőségi ütközés (piros)
  station?: Station | null
}

export function ShiftCard({
  shift,
  role,
  currentUserId,
  onEdit,
  onSwapRequest,
  isDragOverlay = false,
  isSuggestion = false,
  employeePosition: _employeePosition,
  availabilityConflict = false,
  station = null,
}: Props) {
  const { t } = useTranslation()
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false)
  const isManager = ['owner', 'admin', 'manager'].includes(role)
  const isOwnShift = shift.user_id === currentUserId
  const canDrag = isManager && shift.status !== 'cancelled'

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    disabled: !canDrag,
    data: {
      shiftId: shift.id,
      sourceUserId: shift.user_id,
      sourceDateISO: shift.start_time.slice(0, 10),
    },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const startStr = format(parseISO(shift.start_time), 'HH:mm')
  const endStr = format(parseISO(shift.end_time), 'HH:mm')
  const isOvernight = shift.start_time.slice(0, 10) !== shift.end_time.slice(0, 10)
  const statusLabel = t(`shiftStatus.${shift.status}`)
  const statusColor = SHIFT_STATUS_COLORS[shift.status] ?? 'bg-gray-200 text-gray-700'

  const cardClasses = `
    relative group rounded-lg border text-xs select-none cursor-pointer h-full
    transition-all duration-150
    ${isDragging && !isDragOverlay ? 'opacity-40 shadow-none' : ''}
    ${isDragOverlay ? 'shadow-xl rotate-1 scale-105 cursor-grabbing' : 'hover:shadow-md'}
    ${canDrag && !isDragOverlay ? 'cursor-grab active:cursor-grabbing' : ''}
    ${shift.status === 'cancelled' ? 'opacity-50' : ''}
    ${isSuggestion ? 'bg-[#d4a017]/8 border-[#d4a017] border-dashed ring-1 ring-[#d4a017]/40 opacity-80' : ''}
    ${!isSuggestion && availabilityConflict ? 'bg-red-50 border-red-400 text-red-800 ring-1 ring-red-300' : ''}
    ${!isSuggestion && !availabilityConflict && shift.status === 'published' ? 'bg-green-50 border-green-200 text-[#1a5c3a]' : ''}
    ${!isSuggestion && !availabilityConflict && shift.status === 'swappable' ? 'bg-[#d4a017]/10 border-[#d4a017]/40' : ''}
    ${!isSuggestion && !availabilityConflict && shift.status === 'draft' ? 'bg-gray-50 border-gray-200' : ''}
    ${!isSuggestion && !availabilityConflict && shift.status === 'cancelled' ? 'bg-red-50 border-red-200' : ''}
  `.trim()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClasses}
      onClick={() => onEdit(shift)}
      {...(canDrag && !isDragOverlay ? { ...attributes, ...listeners } : {})}
    >
      <div className="h-full flex flex-col items-center justify-center p-2 text-center overflow-hidden">
        {/* Időpont */}
        <div className="font-semibold leading-tight flex items-center justify-center gap-1">
          {startStr}–{endStr}
          {isOvernight && (
            <span title={t('shiftCard.overnight')}>
              <MoveRight className="h-3 w-3 text-indigo-500 inline" />
            </span>
          )}
        </div>

        {/* Megjegyzés */}
        {shift.notes && (
          <div className="w-full mt-0.5 truncate opacity-80 text-[10px]">{shift.notes}</div>
        )}

        {/* Státusz pill / Javaslat badge */}
        {isSuggestion ? (
          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#d4a017] text-white">
            {t('shiftCard.suggestion')}
          </span>
        ) : (
          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        )}

        {/* Állomás badge */}
        {station && (
          <span
            className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-full"
            style={{ backgroundColor: station.color + '28', color: station.color }}
          >
            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
            <span className="truncate">{station.name}</span>
          </span>
        )}

        {/* Csere gomb dolgozónak */}
        {!isManager && isOwnShift && shift.status === 'published' && onSwapRequest && (
          <>
            <button
              className="flex items-center justify-center gap-1 mt-1.5 w-full text-[10px] text-[#d4a017] font-medium hover:underline min-h-[44px] md:min-h-0 py-2 md:py-0"
              onClick={(e) => {
                e.stopPropagation()
                setSwapConfirmOpen(true)
              }}
            >
              <ArrowLeftRight className="h-3 w-3" />
              {t('shiftCard.requestSwap')}
            </button>

            {swapConfirmOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(e) => { e.stopPropagation(); setSwapConfirmOpen(false) }}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-sm font-semibold text-gray-900 mb-1">{t('shiftCard.confirmSwapTitle')}</p>
                  <p className="text-sm text-gray-500 mb-5">
                    {t('shiftCard.confirmSwapMsg')} ({startStr}–{endStr})?
                    {' '}{t('shiftCard.pendingNote')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      onClick={() => setSwapConfirmOpen(false)}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      className="flex-1 px-4 py-2 rounded-lg bg-[#d4a017] text-white text-sm font-medium hover:bg-[#b8871a] transition-colors"
                      onClick={() => { setSwapConfirmOpen(false); onSwapRequest(shift.id) }}
                    >
                      {t('shiftCard.confirmSwapBtn')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
