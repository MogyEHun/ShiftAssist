'use client'

import { useState } from 'react'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { ClockInLogTab } from './ClockInLogTab'
import type { AuditLog, ClockEntry } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  logs: AuditLog[]
  initialEntries: ClockEntry[]
  initialDate: string
  employeeNames: Record<string, string>
}

export function LogPageClient({ logs, initialEntries, initialDate, employeeNames }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'audit' | 'clock'>('audit')

  return (
    <>
      {/* Tab switcher */}
      <div className="bg-gray-100 rounded-lg p-1 flex gap-1 mb-5 self-start">
        <button
          onClick={() => setTab('audit')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('log.tabAudit')}
        </button>
        <button
          onClick={() => setTab('clock')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'clock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('log.tabClock')}
        </button>
      </div>

      {tab === 'audit' && <ActivityLog logs={logs} />}
      {tab === 'clock' && (
        <ClockInLogTab
          initialEntries={initialEntries}
          initialDate={initialDate}
          employeeNames={employeeNames}
        />
      )}
    </>
  )
}
