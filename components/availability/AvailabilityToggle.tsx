'use client'

import { useState, useTransition } from 'react'
import { Users } from 'lucide-react'
import { toggleAvailabilityEnabled } from '@/app/actions/availability'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  enabled: boolean
}

export function AvailabilityToggle({ enabled: initialEnabled }: Props) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const result = await toggleAvailabilityEnabled(next)
      if (result.error) setEnabled(!next)
    })
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100">
      <div className="h-10 w-10 rounded-lg bg-[#1a5c3a]/10 flex items-center justify-center flex-shrink-0">
        <Users className="h-5 w-5 text-[#1a5c3a]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{t('availability.toggleTitle')}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {enabled ? t('availability.toggleEnabledDesc') : t('availability.toggleDisabledDesc')}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
          enabled ? 'bg-[#1a5c3a]' : 'bg-gray-200'
        }`}
        aria-label={t('availability.toggleTitle')}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
