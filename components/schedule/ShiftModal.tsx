'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, differenceInMinutes, addDays } from 'date-fns'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { ShiftWithAssignee, User, ShiftStatus, CreateShiftPayload, ShiftTemplate, Station } from '@/types'
import { createShift, updateShift, deleteShift } from '@/app/actions/schedule'
import { checkLeaveConflict } from '@/app/actions/leave'
import { getShiftTemplates } from '@/app/actions/templates'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  mode: 'create' | 'edit'
  shift?: ShiftWithAssignee
  // Előre kitöltött adatok (cellára kattintáskor)
  prefilledUserId?: string
  prefilledDate?: string
  employees: User[]
  stations?: Station[]
  onSave: (shift: ShiftWithAssignee) => void
  onDelete?: (shiftId: string) => void
  onClose: () => void
}

export function ShiftModal({
  mode,
  shift,
  prefilledUserId,
  prefilledDate,
  employees,
  stations = [],
  onSave,
  onDelete,
  onClose,
}: Props) {
  const { t } = useTranslation()

  const STATUS_OPTIONS = [
    { value: 'published' as ShiftStatus, label: t('shiftModal.statusPublished') },
    { value: 'draft' as ShiftStatus, label: t('shiftModal.statusDraft') },
    { value: 'swappable' as ShiftStatus, label: t('shiftModal.statusSwappable') },
  ]

  const [userId, setUserId] = useState(shift?.user_id ?? prefilledUserId ?? '')
  const [date, setDate] = useState(
    shift ? shift.start_time.slice(0, 10) : (prefilledDate ?? format(new Date(), 'yyyy-MM-dd'))
  )
  const [startTime, setStartTime] = useState(
    shift ? format(parseISO(shift.start_time), 'HH:mm') : '08:00'
  )
  const [endTime, setEndTime] = useState(
    shift ? format(parseISO(shift.end_time), 'HH:mm') : '16:00'
  )
  const [status, setStatus] = useState<ShiftStatus>(shift?.status ?? 'draft')
  const [notes, setNotes] = useState(shift?.notes ?? '')
  const [stationId, setStationId] = useState<string>(shift?.station_id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [leaveConflict, setLeaveConflict] = useState(false)
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])

  useEffect(() => {
    getShiftTemplates().then(({ data }) => setTemplates(data))
  }, [])

  // Szabadság ütközés ellenőrzése ha userId + date változik
  useEffect(() => {
    if (!userId || !date) { setLeaveConflict(false); return }
    let cancelled = false
    checkLeaveConflict(userId, date).then((conflict) => {
      if (!cancelled) setLeaveConflict(conflict)
    })
    return () => { cancelled = true }
  }, [userId, date])

  // Munkaidő és bérköltség számítás
  // Ha a befejezési idő kisebb vagy egyenlő mint a kezdési idő → éjszakán átnyúló műszak (+1 nap)
  const selectedEmployee = employees.find(e => e.id === userId)
  const isOvernight = endTime <= startTime
  const endDate = isOvernight
    ? format(addDays(parseISO(`${date}T00:00:00`), 1), 'yyyy-MM-dd')
    : date
  const startISO = `${date}T${startTime}:00`
  const endISO = `${endDate}T${endTime}:00`
  const minutes = differenceInMinutes(parseISO(endISO), parseISO(startISO))
  const hours = minutes > 0 ? minutes / 60 : 0
  const cost = selectedEmployee?.hourly_rate && hours > 0
    ? hours * selectedEmployee.hourly_rate
    : null

  async function handleSave() {
    if (!date || !startTime || !endTime) {
      setError(t('shiftModal.requiredFields'))
      return
    }
    if (minutes <= 0) {
      setError(t('shiftModal.invalidDuration'))
      return
    }

    setLoading(true)
    setError(null)

    const payload: CreateShiftPayload = {
      user_id: userId || null,
      start_time: startISO,
      end_time: endISO,
      required_position: null,
      status,
      notes: notes || null,
      title: t('shiftModal.defaultTitle'),
      type: 'fixed',
      station_id: stationId || null,
    }

    const result = mode === 'create'
      ? await createShift(payload)
      : await updateShift(shift!.id, payload)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      onSave(result.data)
      onClose()
    }
  }

  async function handleDelete() {
    if (!shift) return
    setLoading(true)
    const result = await deleteShift(shift.id)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onDelete?.(shift.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fejléc */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? t('schedule.newShift') : t('schedule.editShift')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Szabadság ütközés figyelmeztetés */}
          {leaveConflict && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 text-amber-800 text-sm px-3 py-2.5 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
              <span>{t('shiftModal.leaveConflict')}</span>
            </div>
          )}

          {/* Sablon betöltése (3.4) */}
          {templates.length > 0 && mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftModal.loadTemplate')}</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const tpl = templates.find(t => t.id === e.target.value)
                  if (!tpl) return
                  setStartTime(tpl.start_time.slice(0, 5))
                  setEndTime(tpl.end_time.slice(0, 5))
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none bg-gray-50"
              >
                <option value="">{t('shiftModal.chooseTemplate')}</option>
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.start_time.slice(0, 5)}–{tpl.end_time.slice(0, 5)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dolgozó */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftModal.employee')}</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
            >
              <option value="">{t('shiftModal.unassigned')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} {emp.position ? `(${emp.position})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dátum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftModal.date')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
            />
          </div>

          {/* Kezdés – Befejezés */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftModal.startTime')}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                {t('shiftModal.endTime')}
                {isOvernight && (
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {t('shiftModal.overnight')}
                  </span>
                )}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
            </div>
          </div>

          {/* Bérköltség számítás */}
          {hours > 0 && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
              <span className="font-medium">{hours.toFixed(1)} {t('schedule.hoursUnit')}</span>
              {cost !== null && (
                <span className="ml-2 text-[#1a5c3a] font-semibold">
                  ≈ {Math.round(cost).toLocaleString('hu-HU')} Ft
                </span>
              )}
            </div>
          )}

          {/* Státusz */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftModal.status')}</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    status === value
                      ? value === 'published' ? 'bg-[#1a5c3a] text-white border-[#1a5c3a]'
                        : value === 'swappable' ? 'bg-[#d4a017] text-white border-[#d4a017]'
                        : 'bg-gray-600 text-white border-gray-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Állomás */}
          {stations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('shiftModal.station')} <span className="text-gray-400 font-normal">{t('shiftModal.optional')}</span>
              </label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              >
                <option value="">{t('shiftModal.noStation')}</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Megjegyzés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shiftModal.notes')} <span className="text-gray-400 font-normal">{t('shiftModal.optional')}</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('shiftModal.notesPlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none resize-none"
            />
          </div>
        </div>

        {/* Törlés megerősítés */}
        {confirmDelete && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              {t('shiftModal.confirmDeleteMsg')}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {t('shiftModal.confirmDeleteBtn')}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Gombok */}
        <div className="flex items-center gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
          {mode === 'edit' && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors mr-auto"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {mode === 'create' ? t('common.save') : t('common.update')}
          </button>
        </div>
      </div>
    </div>
  )
}
