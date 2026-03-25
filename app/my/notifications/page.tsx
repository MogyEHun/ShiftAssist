import { createClient } from '@/lib/supabase/server'
import { Bell, CheckCircle, AlertCircle, RefreshCcw, CalendarDays, CalendarCheck, CalendarX, PenLine } from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { hu } from 'date-fns/locale'
import { getLocale, getT } from '@/lib/i18n'

const EVENT_ICONS = {
  shift_assigned:  { icon: CalendarCheck, color: 'text-green-600',  bg: 'bg-green-50' },
  shift_updated:   { icon: PenLine,       color: 'text-amber-600', bg: 'bg-amber-50' },
  shift_published: { icon: CalendarDays,  color: 'text-blue-600',  bg: 'bg-blue-50'  },
  shift_cancelled: { icon: CalendarX,     color: 'text-red-500',   bg: 'bg-red-50'   },
  leave_approved:  { icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50' },
  leave_rejected:  { icon: AlertCircle,   color: 'text-red-500',   bg: 'bg-red-50'   },
  swap_approved:   { icon: RefreshCcw,    color: 'text-green-600', bg: 'bg-green-50' },
  swap_rejected:   { icon: AlertCircle,   color: 'text-red-500',   bg: 'bg-red-50'   },
} as const

function formatShiftInfo(newValue: Record<string, unknown> | null, action: string): string | null {
  if (!newValue) return null
  const title = newValue.title as string | undefined
  const startTime = newValue.start_time as string | undefined
  const count = newValue.count as number | undefined

  if (action === 'shift_published' && count && count > 1) {
    const dateStr = startTime ? format(parseISO(startTime), 'MMM d.', { locale: hu }) : ''
    return `${count} műszak${dateStr ? ` – ${dateStr} és további napok` : ''}`
  }
  if (title && startTime) {
    try {
      return `${title} – ${format(parseISO(startTime), 'MMM d. (EEEE) HH:mm', { locale: hu })}`
    } catch { return title }
  }
  return title ?? null
}

export default async function MyNotificationsPage() {
  const t = getT(getLocale())
  const EVENT_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
    shift_assigned:  { ...EVENT_ICONS.shift_assigned,  label: t('notifications.shiftAssigned') },
    shift_updated:   { ...EVENT_ICONS.shift_updated,   label: t('notifications.shiftUpdated') },
    shift_published: { ...EVENT_ICONS.shift_published, label: t('notifications.shiftPublished') },
    shift_cancelled: { ...EVENT_ICONS.shift_cancelled, label: t('notifications.shiftCancelled') },
    leave_approved:  { ...EVENT_ICONS.leave_approved,  label: t('notifications.leaveApproved') },
    leave_rejected:  { ...EVENT_ICONS.leave_rejected,  label: t('notifications.leaveRejected') },
    swap_approved:   { ...EVENT_ICONS.swap_approved,   label: t('notifications.swapApproved') },
    swap_rejected:   { ...EVENT_ICONS.swap_rejected,   label: t('notifications.swapRejected') },
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: logs } = await supabase
    .from('audit_log')
    .select('id, action, entity_id, new_value, created_at')
    .eq('user_id', user.id)
    .in('action', Object.keys(EVENT_CONFIG))
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t('notifications.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('notifications.last50')}</p>
      </div>

      {!logs || logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const cfg = EVENT_CONFIG[log.action]
            if (!cfg) return null
            const Icon = cfg.icon
            const detail = formatShiftInfo(log.new_value as Record<string, unknown> | null, log.action)

            return (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                  {detail && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{detail}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: hu })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
