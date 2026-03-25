'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/components/providers/LanguageProvider'

export type ScheduleView = 'day' | 'week' | 'month' | 'availability'

export function ViewToggle({
  currentView,
  isManager = false,
  group,
}: {
  currentView: ScheduleView
  isManager?: boolean
  group?: 'schedule' | 'management'
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const ALL_VIEWS: { key: ScheduleView; label: string; managerOnly?: boolean; group: 'schedule' | 'management' }[] = [
    { key: 'day',          label: t('schedule.day'),              group: 'schedule' },
    { key: 'week',         label: t('schedule.week'),             group: 'schedule' },
    { key: 'month',        label: t('schedule.month'),            group: 'schedule' },
    { key: 'availability', label: t('schedule.availabilityTitle'), managerOnly: true, group: 'management' },
  ]

  function navigate(view: ScheduleView) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    if (['month', 'availability', 'stations', 'sites'].includes(view)) { params.delete('date'); params.delete('week') }
    if (view === 'week')  { params.delete('date'); params.delete('month') }
    if (view === 'day')   { params.delete('week'); params.delete('month') }
    router.push(`/dashboard/schedule?${params.toString()}`)
  }

  const views = ALL_VIEWS.filter(v =>
    (!v.managerOnly || isManager) &&
    (!group || v.group === group)
  )

  if (views.length === 0) return null

  return (
    <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5 border border-gray-200">
      {views.map((v, i) => (
        <>
          {i > 0 && <div key={`sep-${i}`} className="w-px bg-gray-300 self-stretch my-1" />}
          <button
            key={v.key}
            onClick={() => navigate(v.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              currentView === v.key
                ? 'bg-white text-[#1a5c3a] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        </>
      ))}
    </div>
  )
}
