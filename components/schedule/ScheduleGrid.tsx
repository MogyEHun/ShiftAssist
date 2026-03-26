'use client'

import { useReducer, useState, useCallback, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { format, addDays, parseISO, addWeeks, subWeeks, differenceInMinutes } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, AlertTriangle, PenSquare } from 'lucide-react'
import {
  WeeklyScheduleData,
  ShiftWithAssignee,
  ScheduleAction,
  AiShiftSuggestion,
} from '@/types'
import { moveShift, requestSwap, createShift } from '@/app/actions/schedule'
import { ScheduleCell } from './ScheduleCell'
import { ShiftCard } from './ShiftCard'
import { DragOverlayCard } from './DragOverlayCard'
import { ShiftDetailPanel } from './ShiftDetailPanel'
import { UndoBar } from './UndoBar'
import { AiSuggestionBar } from './AiSuggestionBar'
import { ScheduleActionsBar } from './ScheduleActionsBar'
import { useTranslation } from '@/components/providers/LanguageProvider'

// ------------------------------------------------------------
// Reducer az optimista frissítésekhez
// ------------------------------------------------------------
function scheduleReducer(state: ShiftWithAssignee[], action: ScheduleAction): ShiftWithAssignee[] {
  switch (action.type) {
    case 'MOVE_SHIFT':
      return state.map(s =>
        s.id === action.shiftId
          ? { ...s, user_id: action.newUserId, start_time: action.newStartTime, end_time: action.newEndTime, ...(action.newStatus ? { status: action.newStatus as import('@/types').ShiftStatus } : {}) }
          : s
      )
    case 'ROLLBACK':
      return action.shifts
    case 'ADD_SHIFT':
      return [...state, action.shift]
    case 'UPDATE_SHIFT':
      return state.map(s => s.id === action.shift.id ? action.shift : s)
    case 'DELETE_SHIFT':
      return state.filter(s => s.id !== action.shiftId)
    case 'SET_SUGGESTIONS':
    case 'ACCEPT_ALL_SUGGESTIONS':
    case 'CLEAR_SUGGESTIONS':
      return state  // suggestions kezelése külön state-ben
    default:
      return state
  }
}

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------
interface Props {
  scheduleData: WeeklyScheduleData
  currentUserId: string
  userRole: string
  weekStart: string
}

export function ScheduleGrid({ scheduleData, currentUserId, userRole, weekStart }: Props) {
  const router = useRouter()
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu
  const DAY_SHORTS = [
    t('schedule.days.mon'), t('schedule.days.tue'), t('schedule.days.wed'),
    t('schedule.days.thu'), t('schedule.days.fri'), t('schedule.days.sat'), t('schedule.days.sun'),
  ]
  const [shifts, dispatch] = useReducer(scheduleReducer, scheduleData.shifts)
  const [undoSnapshot, setUndoSnapshot] = useState<ShiftWithAssignee[] | null>(null)
  const [activeShift, setActiveShift] = useState<ShiftWithAssignee | null>(null)
  const [undoData, setUndoData] = useState<{
    shiftId: string; oldUserId: string | null; oldStartTime: string; oldEndTime: string
  } | null>(null)

  // Availability conflict modal
  const [pendingMove, setPendingMove] = useState<{
    shiftId: string
    newUserId: string | null
    newStartISO: string
    newEndISO: string
    employeeName: string
    dateLabel: string
  } | null>(null)

  // Overtime conflict modal
  const [pendingOvertimeMove, setPendingOvertimeMove] = useState<{
    shiftId: string
    newUserId: string | null
    newStartISO: string
    newEndISO: string
    employeeName: string
    projectedHours: number
  } | null>(null)

  // Tervező mód (localStorage perzisztens, alapból BE)
  const [plannerMode, setPlannerMode] = useState(true)

  useEffect(() => {
    if (localStorage.getItem('schedule_planner_mode') === '0') setPlannerMode(false)
  }, [])

  // AI javaslatok (ScheduleActionsBar generálja, itt kezeljük a reducer-en át)
  const [suggestions, setSuggestions] = useState<AiShiftSuggestion[]>([])
  const [acceptingAll, setAcceptingAll] = useState(false)

  // Modal állapot
  const [modal, setModal] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    shift?: ShiftWithAssignee
    prefilledUserId?: string
    prefilledDate?: string
  }>({ open: false, mode: 'create' })

  // Realtime: jelenlét-számláló
  const [editorsCount, setEditorsCount] = useState(1)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const companyId = scheduleData.shifts[0]?.company_id ?? ''
    if (!companyId) return

    const channel = supabase.channel(`schedule-${companyId}`, {
      config: { presence: { key: currentUserId } },
    })

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shifts',
        filter: `company_id=eq.${companyId}`,
      }, () => {
        router.refresh()
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setEditorsCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUserId, joinedAt: Date.now() })
        }
      })

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  // dnd-kit szenzorok (pointer + touch, 8px aktiválási küszöb)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  // Hét napjai (hétfőtől vasárnapig)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(parseISO(weekStart), i))

  // Mobil napi nézet (6.3)
  const [activeDayIdx, setActiveDayIdx] = useState(() => {
    const today = new Date()
    const todayISO = format(today, 'yyyy-MM-dd')
    const idx = weekDates.findIndex(d => format(d, 'yyyy-MM-dd') === todayISO)
    return idx >= 0 ? idx : 0
  })

  // Virtualizátor referencia (6.1)
  const parentRef = useRef<HTMLDivElement>(null)
  const employees = scheduleData.employees
  const useVirtualRows = employees.length >= 20

  const rowVirtualizer = useVirtualizer({
    count: useVirtualRows ? employees.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 73,
    overscan: 3,
  })

  // Hét navigáció
  function navigate(dir: 1 | -1) {
    const newDate = dir === 1 ? addWeeks(parseISO(weekStart), 1) : subWeeks(parseISO(weekStart), 1)
    router.push(`/dashboard/schedule?week=${format(newDate, 'yyyy-MM-dd')}`)
  }

  function goToToday() {
    const { startOfWeek } = require('date-fns')
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    router.push(`/dashboard/schedule?week=${format(monday, 'yyyy-MM-dd')}`)
  }

  // Drag start
  function handleDragStart(event: DragStartEvent) {
    const s = shifts.find(s => s.id === event.active.id)
    if (s) setActiveShift(s)
  }

  // Tényleges mozgatás (optimista + szerver)
  async function executeMoveShift(
    draggedShift: ShiftWithAssignee,
    newUserId: string | null,
    newStartISO: string,
    newEndISO: string,
  ) {
    const snapshot = [...shifts]
    setUndoSnapshot(snapshot)
    setUndoData({
      shiftId: draggedShift.id,
      oldUserId: draggedShift.user_id,
      oldStartTime: draggedShift.start_time,
      oldEndTime: draggedShift.end_time,
    })
    dispatch({
      type: 'MOVE_SHIFT',
      shiftId: draggedShift.id,
      newUserId,
      newStartTime: newStartISO,
      newEndTime: newEndISO,
      ...(plannerMode ? { newStatus: 'draft' } : {}),
    })
    const result = await moveShift(draggedShift.id, newUserId, newStartISO, newEndISO, plannerMode)
    if (result.error) {
      dispatch({ type: 'ROLLBACK', shifts: snapshot })
      setUndoSnapshot(null)
      setUndoData(null)
    }
  }

  // Drag end
  async function handleDragEnd(event: DragEndEvent) {
    setActiveShift(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const [newUserId, newDateISO] = String(over.id).split('::')
    const draggedShift = shifts.find(s => s.id === active.id)
    if (!draggedShift) return

    // Időtartam megőrzése, csak dátum és dolgozó változik
    const origStart = parseISO(draggedShift.start_time)
    const origEnd = parseISO(draggedShift.end_time)
    const durationMs = origEnd.getTime() - origStart.getTime()

    const newStart = new Date(newDateISO + 'T' + format(origStart, 'HH:mm:ss'))
    const newEnd = new Date(newStart.getTime() + durationMs)
    const newStartISO = newStart.toISOString()
    const newEndISO = newEnd.toISOString()

    // Elérhetőség ellenőrzés
    const targetUserId = newUserId || draggedShift.user_id
    const availEntry = scheduleData.availabilityDates.find(
      a => a.user_id === targetUserId && a.date === newDateISO
    )
    if (availEntry?.status === 'unavailable') {
      const emp = scheduleData.employees.find(e => e.id === targetUserId)
      setPendingMove({
        shiftId: draggedShift.id,
        newUserId: newUserId || null,
        newStartISO,
        newEndISO,
        employeeName: emp?.full_name ?? '',
        dateLabel: format(parseISO(newDateISO), 'MMM d., EEEE', { locale: dfLocale }),
      })
      return
    }

    // Túlóra ellenőrzés (csak ha más dolgozóra húzzuk)
    const resolvedTargetId = newUserId || draggedShift.user_id
    const isSameUser = resolvedTargetId === draggedShift.user_id
    if (!isSameUser && resolvedTargetId) {
      const shiftMinutes = differenceInMinutes(new Date(newEndISO), new Date(newStartISO))
      const currentMinutes = scheduleData.weeklyHoursPerUser[resolvedTargetId] ?? 0
      const projectedHours = Math.round((currentMinutes + shiftMinutes) / 60 * 10) / 10
      const maxLimit = scheduleData.overtimeConfig?.weekly_hour_max ?? 48
      if (projectedHours >= maxLimit) {
        const emp = scheduleData.employees.find(e => e.id === resolvedTargetId)
        setPendingOvertimeMove({
          shiftId: draggedShift.id,
          newUserId: newUserId || null,
          newStartISO,
          newEndISO,
          employeeName: emp?.full_name ?? '',
          projectedHours,
        })
        return
      }
    }

    // Published műszak ütközés ellenőrzés
    const hasPublishedInTarget = shifts.some(
      s => s.user_id === (newUserId || draggedShift.user_id) &&
           s.start_time.slice(0, 10) === newDateISO &&
           s.status === 'published' &&
           s.id !== draggedShift.id
    )
    if (hasPublishedInTarget && !window.confirm('Ennek a dolgozónak már van fixált műszakja ezen a napon. Biztosan folytatod?')) {
      return
    }

    await executeMoveShift(draggedShift, newUserId || null, newStartISO, newEndISO)
  }

  // Undo visszavonás
  async function handleUndo() {
    if (!undoData || !undoSnapshot) return
    dispatch({ type: 'ROLLBACK', shifts: undoSnapshot })
    await moveShift(undoData.shiftId, undoData.oldUserId, undoData.oldStartTime, undoData.oldEndTime)
    setUndoSnapshot(null)
    setUndoData(null)
  }

  // Csere kérelem
  async function handleSwapRequest(shiftId: string) {
    const result = await requestSwap(shiftId)
    if (!result.error) {
      dispatch({
        type: 'UPDATE_SHIFT',
        shift: { ...shifts.find(s => s.id === shiftId)!, status: 'swappable' },
      })
    }
  }

  // AI javaslatok elfogadása
  async function acceptAllSuggestions() {
    if (suggestions.length === 0) return
    setAcceptingAll(true)
    for (const s of suggestions) {
      try {
        const result = await createShift({
          user_id: s.user_id,
          start_time: s.start_time,
          end_time: s.end_time,
          required_position: s.required_position,
          status: 'draft',
          notes: s.notes,
          title: s.required_position ?? 'Műszak',
          type: 'fixed',
        })
        if (result.data) {
          dispatch({ type: 'ADD_SHIFT', shift: result.data })
        }
      } catch {}
    }
    setSuggestions([])
    setAcceptingAll(false)
  }

  // Modal kezelők
  const openCreateModal = useCallback((userId: string, dateISO: string) => {
    const hasPublished = shifts.some(
      s => s.user_id === userId && s.start_time.slice(0, 10) === dateISO && s.status === 'published'
    )
    if (hasPublished && !window.confirm('Ennek a dolgozónak már van fixált műszakja ezen a napon. Biztosan hozzáadsz egy újat?')) {
      return
    }
    setModal({ open: true, mode: 'create', prefilledUserId: userId, prefilledDate: dateISO })
  }, [shifts])

  const openEditModal = useCallback((shift: ShiftWithAssignee) => {
    setModal({ open: true, mode: 'edit', shift })
  }, [])

  function handleShiftSaved(savedShift: ShiftWithAssignee) {
    if (modal.mode === 'create') {
      dispatch({ type: 'ADD_SHIFT', shift: savedShift })
    } else {
      dispatch({ type: 'UPDATE_SHIFT', shift: savedShift })
    }
  }

  function handleShiftDeleted(shiftId: string) {
    dispatch({ type: 'DELETE_SHIFT', shiftId })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isManager = ['owner', 'admin', 'manager'].includes(userRole)

  const activeShifts = shifts.filter(s => s.status !== 'cancelled')
  const statTotalShifts = activeShifts.length

  return (
    <div className="flex flex-col h-full">
      {/* AI javaslat sáv */}
      {suggestions.length > 0 && (
        <AiSuggestionBar
          count={suggestions.length}
          accepting={acceptingAll}
          onAcceptAll={acceptAllSuggestions}
          onDismiss={() => setSuggestions([])}
        />
      )}

      {/* Toolbar – 1. sor: navigáció + action gombok */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            aria-label={t('schedule.prevWeek')}
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            {t('schedule.today')}
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            aria-label={t('schedule.nextWeek')}
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <span className="text-sm font-semibold text-gray-800">
          {format(weekDates[0], 'MMM d.', { locale: dfLocale })}
          {' – '}
          {format(weekDates[6], 'MMM d.', { locale: dfLocale })}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {editorsCount > 1 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-lg border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              {editorsCount} {t('schedule.editors')}
            </span>
          )}
          <ScheduleActionsBar
            shifts={shifts}
            employees={scheduleData.employees}
            positions={scheduleData.positions.map(p => p.name)}
            approvedLeaves={scheduleData.approvedLeaves}
            isManager={isManager}
            weekDates={weekDates}
            onPlannerModeChange={setPlannerMode}
            onAiGenerated={setSuggestions}
            onPublished={(ids) => {
              ids.forEach(id => {
                const s = shifts.find(sh => sh.id === id)
                if (s) dispatch({ type: 'UPDATE_SHIFT', shift: { ...s, status: 'published' } })
              })
            }}
          />
        </div>
      </div>

      {/* Tervező mód banner */}
      {plannerMode && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <PenSquare className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t('schedule.plannerBanner')}</span>
        </div>
      )}

      {/* Toolbar – 2. sor: jelmagyarázat */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200" />
          {t('schedule.legendPublished')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#d4a017]/10 border border-[#d4a017]/40" />
          {t('schedule.legendSwappable')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-50 border border-gray-200" />
          {t('schedule.draft')}
        </span>
      </div>

      {/* Mobil napi navigáció (6.3) */}
      <div className="md:hidden flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 mb-2">
        <button
          onClick={() => setActiveDayIdx(i => Math.max(0, i - 1))}
          disabled={activeDayIdx === 0}
          className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">{DAY_SHORTS[activeDayIdx]}</div>
          <div className="text-xs text-gray-500">{format(weekDates[activeDayIdx], 'MMM d.', { locale: dfLocale })}</div>
        </div>
        <button
          onClick={() => setActiveDayIdx(i => Math.min(6, i + 1))}
          disabled={activeDayIdx === 6}
          className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Stat sáv */}
      {isManager && (
        <div className="flex items-center gap-5 px-4 py-2 mb-2 bg-white rounded-xl border border-gray-200 text-sm text-gray-600">
          <span>{t('schedule.totalShifts')} <strong className="text-gray-900">{statTotalShifts} {t('schedule.shiftsUnit')}</strong></span>
        </div>
      )}

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={parentRef} className="bg-white rounded-xl border border-gray-200 overflow-auto flex-1">
          {/* ---- Fejléc (sticky) ---- */}
          <div
            className="grid min-w-[900px] sticky top-0 z-20"
            style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}
          >
            <div className="bg-gray-50 border-b border-r border-gray-200 p-3" />
            {weekDates.map((date, idx) => {
              const todayHL = isToday(date)
              return (
                <div
                  key={idx}
                  className={`border-b border-r border-gray-200 p-3 text-center ${
                    todayHL ? 'bg-[#1a5c3a]/8' : 'bg-gray-50'
                  } ${idx !== activeDayIdx ? 'hidden md:block' : ''}`}
                >
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {DAY_SHORTS[idx].slice(0, 3)}
                  </div>
                  <div
                    className={`text-lg font-bold mt-0.5 leading-none ${
                      todayHL ? 'text-white bg-[#1a5c3a] w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-gray-800'
                    }`}
                  >
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ---- Dolgozó sorok (virtualizált ha >= 20 fő) ---- */}
          {useVirtualRows ? (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', minWidth: '900px' }}>
              {rowVirtualizer.getVirtualItems().map((vr) => {
                const employee = employees[vr.index]
                const weeklyMinutes = scheduleData.weeklyHoursPerUser[employee.id] ?? 0
                const weeklyHours = Math.round(weeklyMinutes / 60 * 10) / 10
                const warnLimit = scheduleData.overtimeConfig?.weekly_hour_warning ?? 40
                const maxLimit = scheduleData.overtimeConfig?.weekly_hour_max ?? 48
                const isOverMax = weeklyHours >= maxLimit
                const isOverWarn = weeklyHours >= warnLimit && !isOverMax
                return (
                  <div
                    key={vr.key}
                    data-index={vr.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ position: 'absolute', top: vr.start, width: '100%', display: 'grid', gridTemplateColumns: '200px repeat(7, 1fr)' }}
                  >
                    <div className="border-b border-r border-gray-200 p-3 flex items-center gap-2 bg-white sticky left-0 z-10">
                      <div className="h-8 w-8 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1a5c3a] uppercase">
                        {employee.full_name.slice(0, 2)}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="text-sm font-medium text-gray-800 truncate">{employee.full_name}</div>
                        {employee.position && <div className="text-xs text-gray-400 truncate">{employee.position}</div>}
                      </div>
                      {(isOverWarn || isOverMax) && (
                        <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md ${isOverMax ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`} title={`${weeklyHours}h heti munkaidő`}>
                          {weeklyHours}h
                        </span>
                      )}
                    </div>
                    {weekDates.map((date, dayIdx) => {
                      const dateISO = format(date, 'yyyy-MM-dd')
                      const droppableId = `${employee.id}::${dateISO}`
                      const cellShifts = shifts.filter(s => s.user_id === employee.id && s.start_time.slice(0, 10) === dateISO)
                      const availEntryV = scheduleData.availabilityDates.find(a => a.user_id === employee.id && a.date === dateISO)
                      const isUnavailable = availEntryV?.status === 'unavailable'
                      const leaveRequest = scheduleData.approvedLeaves?.find(
                        l => l.user_id === employee.id && l.start_date <= dateISO && l.end_date >= dateISO
                      ) ?? null
                      return (
                        <div key={dayIdx} className={`border-b border-r border-gray-200 ${dayIdx !== activeDayIdx ? 'hidden md:block' : ''}`}>
                          <ScheduleCell droppableId={droppableId} dateISO={dateISO} shifts={cellShifts} role={userRole} currentUserId={currentUserId} onEmptyCellClick={openCreateModal} onEditShift={openEditModal} onSwapRequest={handleSwapRequest} leaveRequest={leaveRequest} employeePosition={employee.position ?? undefined} availabilityConflict={isUnavailable} stations={scheduleData.stations} />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : (
          <div
            className="grid min-w-[900px]"
            style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}
          >
            {/* Dolgozó sorok (< 20 fő, nem virtualizált) */}
            {employees.map((employee) => {
              const weeklyMinutes = scheduleData.weeklyHoursPerUser[employee.id] ?? 0
              const weeklyHours = Math.round(weeklyMinutes / 60 * 10) / 10
              const warnLimit = scheduleData.overtimeConfig?.weekly_hour_warning ?? 40
              const maxLimit = scheduleData.overtimeConfig?.weekly_hour_max ?? 48
              const isOverMax = weeklyHours >= maxLimit
              const isOverWarn = weeklyHours >= warnLimit && !isOverMax

              return (
              <>
                {/* Névoszlop */}
                <div
                  key={`name-${employee.id}`}
                  className="border-b border-r border-gray-200 p-3 flex items-center gap-2 bg-white sticky left-0 z-10"
                >
                  <div className="h-8 w-8 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1a5c3a] uppercase">
                    {employee.full_name.slice(0, 2)}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{employee.full_name}</div>
                    {employee.position && (
                      <div className="text-xs text-gray-400 truncate">{employee.position}</div>
                    )}
                  </div>
                  {(isOverWarn || isOverMax) && (
                    <span
                      className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        isOverMax
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                      title={`${weeklyHours}h heti munkaidő`}
                    >
                      {weeklyHours}h
                    </span>
                  )}
                </div>

                {/* Nap cellek */}
                {weekDates.map((date, dayIdx) => {
                  const dateISO = format(date, 'yyyy-MM-dd')
                  const droppableId = `${employee.id}::${dateISO}`
                  const cellShifts = shifts.filter(
                    s => s.user_id === employee.id && s.start_time.slice(0, 10) === dateISO
                  )
                  const cellSuggestions = suggestions.filter(
                    s => s.user_id === employee.id && s.start_time.slice(0, 10) === dateISO
                  )

                  // Availability figyelmeztetés (dátum alapú)
                  const availEntry = scheduleData.availabilityDates.find(
                    a => a.user_id === employee.id && a.date === dateISO
                  )
                  const isUnavailable = availEntry?.status === 'unavailable'
                  const leaveRequest = scheduleData.approvedLeaves?.find(
                    l => l.user_id === employee.id && l.start_date <= dateISO && l.end_date >= dateISO
                  ) ?? null

                  return (
                    <div
                      key={`cell-${employee.id}-${dayIdx}`}
                      className="border-b border-r border-gray-200"
                    >
                      <ScheduleCell
                        droppableId={droppableId}
                        dateISO={dateISO}
                        shifts={cellShifts}
                        role={userRole}
                        currentUserId={currentUserId}
                        onEmptyCellClick={openCreateModal}
                        onEditShift={openEditModal}
                        onSwapRequest={handleSwapRequest}
                        leaveRequest={leaveRequest}
                        employeePosition={employee.position ?? undefined}
                        availabilityConflict={isUnavailable}
                        stations={scheduleData.stations}
                      />
                      {cellSuggestions.map((sg) => {
                        const fakeShift: ShiftWithAssignee = {
                          id: sg.suggestion_id,
                          user_id: sg.user_id,
                          company_id: '',
                          start_time: sg.start_time,
                          end_time: sg.end_time,
                          required_position: sg.required_position,
                          status: 'draft',
                          notes: sg.notes,
                          title: sg.required_position ?? 'Javaslat',
                          type: 'fixed',
                          location: null,
                          station_id: null,
                          break_minutes: 0,
                          created_by: '',
                          created_at: '',
                          updated_at: '',
                          assignee: null,
                        }
                        return (
                          <div key={sg.suggestion_id} className="px-1.5 pb-1">
                            <ShiftCard
                              shift={fakeShift}
                              role={userRole}
                              currentUserId={currentUserId}
                              onEdit={() => {}}
                              isSuggestion
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )})}
          </div>
          )} {/* useVirtualRows ternary vége */}
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeShift ? <DragOverlayCard shift={activeShift} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Undo sáv */}
      <UndoBar
        canUndo={!!undoSnapshot}
        onUndo={handleUndo}
        onDismiss={() => { setUndoSnapshot(null); setUndoData(null) }}
      />

      {/* Shift detail panel (jobbról besiló) */}
      {modal.open && (
        <ShiftDetailPanel
          mode={modal.mode}
          shift={modal.shift}
          prefilledUserId={modal.prefilledUserId}
          prefilledDate={modal.prefilledDate}
          employees={scheduleData.employees}
          stations={scheduleData.stations}
          availabilityDates={scheduleData.availabilityDates}
          plannerMode={plannerMode}
          onSave={handleShiftSaved}
          onDelete={handleShiftDeleted}
          onClose={() => setModal({ open: false, mode: 'create' })}
        />
      )}

      {/* Elérhetőség ütközés megerősítő modal */}
      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('schedule.availabilityConflict')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>{pendingMove.employeeName}</strong> {t('availability.notAvailable')}{' '}
                  <strong>{pendingMove.dateLabel}</strong>. {t('schedule.confirmAssign')}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingMove(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  const shift = shifts.find(s => s.id === pendingMove.shiftId)
                  if (shift) await executeMoveShift(shift, pendingMove.newUserId, pendingMove.newStartISO, pendingMove.newEndISO)
                  setPendingMove(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('schedule.assignAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Túlóra megerősítő modal */}
      {pendingOvertimeMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('schedule.overtimeWarning')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>{pendingOvertimeMove.employeeName}</strong> ezen a héten ezzel a műszakkal{' '}
                  <strong>{pendingOvertimeMove.projectedHours}h</strong> munkaideje lenne, ami meghaladja a{' '}
                  <strong>{scheduleData.overtimeConfig?.weekly_hour_max ?? 48}h</strong> limitet. {t('schedule.confirmAssign')}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingOvertimeMove(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  const shift = shifts.find(s => s.id === pendingOvertimeMove.shiftId)
                  if (shift) await executeMoveShift(shift, pendingOvertimeMove.newUserId, pendingOvertimeMove.newStartISO, pendingOvertimeMove.newEndISO)
                  setPendingOvertimeMove(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
              >
                {t('schedule.assignAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jelenléti ív export modal */}
    </div>
  )
}
