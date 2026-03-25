'use client'

import { useState } from 'react'
import { AuditLog } from '@/types'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import {
  Undo2, Calendar, FileText, UserCheck, UserX, User,
  ArrowLeftRight, ClipboardList, CheckCircle2, Trash2, RotateCcw, Building2, MapPin, Building,
} from 'lucide-react'
import { undoLastShiftDelete } from '@/app/actions/audit'
import { useTranslation } from '@/components/providers/LanguageProvider'

function prettifyAction(action: string): string {
  return action.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  'shift.create':      Calendar,
  'shift.update':      Calendar,
  'shift.delete':      Calendar,
  'shift.move':        ArrowLeftRight,
  'shift.assign':      Calendar,
  'shifts.publish':    Calendar,
  'swap.resolved':     ArrowLeftRight,
  'swap.create':       ArrowLeftRight,
  'leave.create':      FileText,
  'leave.resolved':    FileText,
  'leave.approve':     FileText,
  'leave.reject':      FileText,
  'task.create':       ClipboardList,
  'task.complete':     CheckCircle2,
  'task.reopen':       RotateCcw,
  'task.delete':       Trash2,
  'staff.invite':      UserCheck,
  'staff.invite_link': UserCheck,
  'staff.update':      User,
  'staff.deactivate':  UserX,
  'staff.activate':    UserCheck,
  'staff.role_change': User,
  // underscore variants stored in DB
  'shift_create':     Calendar,
  'shift_update':     Calendar,
  'shift_delete':     Calendar,
  'shift_move':       ArrowLeftRight,
  'shift_assigned':   Calendar,
  'shifts_publish':   Calendar,
  'shift_published':  Calendar,
  'swap_resolved':    ArrowLeftRight,
  'leave_create':     FileText,
  'leave_resolved':   FileText,
  'task_create':      ClipboardList,
  'task_complete':    CheckCircle2,
  'task_reopen':      RotateCcw,
  'task_delete':      Trash2,
  'staff_invite':     UserCheck,
  'staff_update':     User,
  'staff_deactivate': UserX,
  'staff_activate':   UserCheck,
  'staff_role_change': User,
  // department actions
  'department.create':  Building2,
  'department.update':  Building2,
  'department.delete':  Building2,
  'department_create':  Building2,
  'department_update':  Building2,
  'department_delete':  Building2,
  // station actions
  'station.create':  MapPin,
  'station.update':  MapPin,
  'station.delete':  MapPin,
  'station_create':  MapPin,
  'station_update':  MapPin,
  'station_delete':  MapPin,
  // site actions
  'site.create':  Building,
  'site.update':  Building,
  'site.delete':  Building,
  'site_create':  Building,
  'site_update':  Building,
  'site_delete':  Building,
}

const ACTION_COLORS: Record<string, string> = {
  'shift.delete':     'bg-red-100 text-red-600',
  'staff.deactivate': 'bg-red-100 text-red-600',
  'task.delete':      'bg-red-100 text-red-600',
  'shift.create':      'bg-green-100 text-green-700',
  'shift.assign':      'bg-green-100 text-green-700',
  'shifts.publish':    'bg-blue-100 text-blue-700',
  'staff.invite':      'bg-green-100 text-green-700',
  'staff.invite_link': 'bg-green-100 text-green-700',
  'staff.activate':    'bg-green-100 text-green-700',
  'task.create':       'bg-blue-100 text-blue-700',
  'task.complete':     'bg-green-100 text-green-700',
  'task.reopen':       'bg-amber-100 text-amber-700',
  'leave.create':      'bg-purple-100 text-purple-700',
  'leave.resolved':    'bg-teal-100 text-teal-700',
  'leave.approve':     'bg-teal-100 text-teal-700',
  'leave.reject':      'bg-red-100 text-red-600',
  'swap.create':       'bg-indigo-100 text-indigo-700',
  // underscore variants
  'shift_delete':     'bg-red-100 text-red-600',
  'staff_deactivate': 'bg-red-100 text-red-600',
  'task_delete':      'bg-red-100 text-red-600',
  'shift_create':     'bg-green-100 text-green-700',
  'shift_assigned':   'bg-green-100 text-green-700',
  'shifts_publish':   'bg-blue-100 text-blue-700',
  'shift_published':  'bg-blue-100 text-blue-700',
  'staff_invite':     'bg-green-100 text-green-700',
  'staff_activate':   'bg-green-100 text-green-700',
  'task_create':      'bg-blue-100 text-blue-700',
  'task_complete':    'bg-green-100 text-green-700',
  'task_reopen':      'bg-amber-100 text-amber-700',
  'leave_create':     'bg-purple-100 text-purple-700',
  'leave_resolved':   'bg-teal-100 text-teal-700',
  // department actions
  'department.create':  'bg-violet-100 text-violet-700',
  'department.update':  'bg-violet-100 text-violet-700',
  'department.delete':  'bg-red-100 text-red-600',
  'department_create':  'bg-violet-100 text-violet-700',
  'department_update':  'bg-violet-100 text-violet-700',
  'department_delete':  'bg-red-100 text-red-600',
  // station actions
  'station.create':  'bg-indigo-100 text-indigo-700',
  'station.update':  'bg-indigo-100 text-indigo-700',
  'station.delete':  'bg-red-100 text-red-600',
  'station_create':  'bg-indigo-100 text-indigo-700',
  'station_update':  'bg-indigo-100 text-indigo-700',
  'station_delete':  'bg-red-100 text-red-600',
  // site actions
  'site.create':  'bg-teal-100 text-teal-700',
  'site.update':  'bg-teal-100 text-teal-700',
  'site.delete':  'bg-red-100 text-red-600',
  'site_create':  'bg-teal-100 text-teal-700',
  'site_update':  'bg-teal-100 text-teal-700',
  'site_delete':  'bg-red-100 text-red-600',
}

interface Props {
  logs: AuditLog[]
}

export function ActivityLog({ logs }: Props) {
  // Compute before hooks so useState can use defaultDay as initial value
  const grouped = logs.reduce<Record<string, AuditLog[]>>((acc, log) => {
    const day = format(parseISO(log.created_at), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(log)
    return acc
  }, {})
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const defaultDay = days.includes(todayStr) ? todayStr : (days[0] ?? todayStr)

  // All hooks together at the top
  const { t, locale } = useTranslation()
  const [undoing, setUndoing] = useState<string | null>(null)
  const [undoneIds, setUndoneIds] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedDay, setSelectedDay] = useState(defaultDay)

  const ACTION_LABELS: Record<string, string> = {
    'shift.create':      t('log.actions.shiftCreate'),
    'shift.update':      t('log.actions.shiftUpdate'),
    'shift.delete':      t('log.actions.shiftDelete'),
    'shift.move':        t('log.actions.shiftMove'),
    'shift.assign':      t('log.actions.shiftAssigned'),
    'shifts.publish':    t('log.actions.shiftsPublish'),
    'swap.resolved':     t('log.actions.swapResolved'),
    'swap.create':       t('log.actions.swapCreate'),
    'leave.create':      t('log.actions.leaveCreate'),
    'leave.resolved':    t('log.actions.leaveResolved'),
    'leave.approve':     t('log.actions.leaveApprove'),
    'leave.reject':      t('log.actions.leaveReject'),
    'task.create':       t('log.actions.taskCreate'),
    'task.complete':     t('log.actions.taskComplete'),
    'task.reopen':       t('log.actions.taskReopen'),
    'task.delete':       t('log.actions.taskDelete'),
    'staff.invite':      t('log.actions.staffInvite'),
    'staff.invite_link': t('log.actions.staffInviteLink'),
    'staff.update':      t('log.actions.staffUpdate'),
    'staff.deactivate':  t('log.actions.staffDeactivate'),
    'staff.activate':    t('log.actions.staffActivate'),
    'staff.role_change': t('log.actions.staffRoleChange'),
    // underscore variants stored in DB
    'shift_create':      t('log.actions.shiftCreate'),
    'shift_update':      t('log.actions.shiftUpdate'),
    'shift_delete':      t('log.actions.shiftDelete'),
    'shift_move':        t('log.actions.shiftMove'),
    'shift_assigned':    t('log.actions.shiftAssigned'),
    'shifts_publish':    t('log.actions.shiftsPublish'),
    'shift_published':   t('log.actions.shiftsPublish'),
    'swap_resolved':     t('log.actions.swapResolved'),
    'leave_create':      t('log.actions.leaveCreate'),
    'leave_resolved':    t('log.actions.leaveResolved'),
    'task_create':       t('log.actions.taskCreate'),
    'task_complete':     t('log.actions.taskComplete'),
    'task_reopen':       t('log.actions.taskReopen'),
    'task_delete':       t('log.actions.taskDelete'),
    'staff_invite':      t('log.actions.staffInvite'),
    'staff_update':      t('log.actions.staffUpdate'),
    'staff_deactivate':  t('log.actions.staffDeactivate'),
    'staff_activate':    t('log.actions.staffActivate'),
    'staff_role_change': t('log.actions.staffRoleChange'),
    // department actions
    'department.create':  t('log.actions.departmentCreate'),
    'department.update':  t('log.actions.departmentUpdate'),
    'department.delete':  t('log.actions.departmentDelete'),
    'department_create':  t('log.actions.departmentCreate'),
    'department_update':  t('log.actions.departmentUpdate'),
    'department_delete':  t('log.actions.departmentDelete'),
    // station actions
    'station.create':  t('log.actions.stationCreate'),
    'station.update':  t('log.actions.stationUpdate'),
    'station.delete':  t('log.actions.stationDelete'),
    'station_create':  t('log.actions.stationCreate'),
    'station_update':  t('log.actions.stationUpdate'),
    'station_delete':  t('log.actions.stationDelete'),
    // site actions
    'site.create':  t('log.actions.siteCreate'),
    'site.update':  t('log.actions.siteUpdate'),
    'site.delete':  t('log.actions.siteDelete'),
    'site_create':  t('log.actions.siteCreate'),
    'site_update':  t('log.actions.siteUpdate'),
    'site_delete':  t('log.actions.siteDelete'),
  }

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    vacation: t('log.leaveTypes.vacation'),
    sick:     t('log.leaveTypes.sick'),
    unpaid:   t('log.leaveTypes.unpaid'),
    other:    t('log.leaveTypes.other'),
  }

  function getSubtitle(log: AuditLog): string | null {
    const v = log.new_value ?? log.old_value
    if (!v || typeof v !== 'object') return null
    const action = log.action

    if (action === 'task.create' || action === 'task.complete' || action === 'task.reopen' ||
        action === 'task_create' || action === 'task_complete' || action === 'task_reopen') {
      return (v as any).title ?? null
    }
    if (action === 'task.delete' || action === 'task_delete') {
      const title = (log.old_value as any)?.title ?? (v as any).title
      return title ?? null
    }
    if (action === 'leave.create' || action === 'leave_create') {
      const type = LEAVE_TYPE_LABELS[(v as any).type] ?? (v as any).type
      const start = (v as any).start_date
      const end = (v as any).end_date
      if (start && end) return `${type} · ${start} – ${end}`
      return type ?? null
    }
    if (action === 'leave.resolved' || action === 'leave_resolved') {
      const approved = (v as any).approved
      return approved === true ? t('log.approved') : approved === false ? t('log.rejected') : null
    }
    if ('title' in (v as any)) return (v as any).title
    return null
  }

  function formatDayLabel(dateStr: string): string {
    const d = parseISO(dateStr)
    const dateFnsLocale = locale === 'en' ? enUS : hu
    if (isToday(d)) return t('log.today') as string
    if (isYesterday(d)) return t('log.yesterday') as string
    return format(d, locale === 'en' ? 'MMMM d, yyyy (EEEE)' : 'yyyy. MMMM d., EEEE', { locale: dateFnsLocale })
  }

  const canUndo = (log: AuditLog) => {
    if (log.action !== 'shift.delete' && log.action !== 'shift_delete') return false
    if (undoneIds.has(log.id)) return false
    return Date.now() - new Date(log.created_at).getTime() <= 10 * 60 * 1000
  }

  async function handleUndo(log: AuditLog) {
    setUndoing(log.id)
    setErrors(prev => ({ ...prev, [log.id]: '' }))
    const result = await undoLastShiftDelete(log.id)
    if (result.success) {
      setUndoneIds(prev => new Set(Array.from(prev).concat(log.id)))
    } else {
      setErrors(prev => ({ ...prev, [log.id]: result.error ?? t('common.error') }))
    }
    setUndoing(null)
  }

  const dayLogs = grouped[selectedDay] ?? []

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500 flex-shrink-0">{t('log.selectDay')}</label>
        <input
          type="date"
          value={selectedDay}
          max={todayStr}
          onChange={e => e.target.value && setSelectedDay(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
        />
        {grouped[selectedDay] && (
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {grouped[selectedDay].length} {t('log.events')}
          </span>
        )}
      </div>

      {/* Events for selected day */}
      {dayLogs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('log.noActivity')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {dayLogs.map(log => {
            const Icon = ACTION_ICONS[log.action] ?? FileText
            const colorClass = ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
            const label = ACTION_LABELS[log.action] ?? prettifyAction(log.action)
            const subtitle = getSubtitle(log)
            const timeStr = format(parseISO(log.created_at), 'HH:mm')

            return (
              <div
                key={log.id}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${colorClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {log.user && (
                      <span className="text-xs text-gray-500">{log.user.full_name}</span>
                    )}
                    {subtitle && log.user && (
                      <span className="text-xs text-gray-300">·</span>
                    )}
                    {subtitle && (
                      <span className="text-xs text-gray-400">{subtitle}</span>
                    )}
                  </div>
                  {errors[log.id] && (
                    <p className="text-xs text-red-500 mt-1">{errors[log.id]}</p>
                  )}
                  {undoneIds.has(log.id) && (
                    <p className="text-xs text-green-600 mt-1">{t('log.undone')}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 tabular-nums">{timeStr}</span>
                  {canUndo(log) && (
                    <button
                      onClick={() => handleUndo(log)}
                      disabled={undoing === log.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <Undo2 className="h-3 w-3" />
                      {undoing === log.id ? '...' : t('log.back')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
