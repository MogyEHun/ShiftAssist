'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { requestAccountDeletion, cancelAccountDeletion } from '@/app/actions/gdpr'
import { useTranslation } from '@/components/providers/LanguageProvider'

export default function DeleteAccountPage() {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [confirmedName, setConfirmedName] = useState('')
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deletionDate, setDeletionDate] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmedName.trim()) return
    setLoading(true)
    setError(null)

    const result = await requestAccountDeletion(confirmedName)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setDeletionDate(result.deletionDate ?? null)
    }
    setLoading(false)
  }

  async function handleCancel() {
    setCancelling(true)
    const result = await cancelAccountDeletion()
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/dashboard/settings')
    }
    setCancelling(false)
  }

  if (success) {
    return (
      <div className="p-6 max-w-lg">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">{t('settings.deleteSubmitted')}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('settings.deleteWillHappenIn')}{' '}
            <strong>
              {deletionDate
                ? new Date(deletionDate).toLocaleDateString(locale === 'en' ? 'en-GB' : 'hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
                : t('settings.deleteDaysFromNow')}
            </strong>{' '}
            {t('settings.deleteDoneText')}
          </p>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-4 py-2 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 disabled:opacity-50"
          >
            {cancelling ? t('settings.deleteWithdrawing') : t('settings.deleteWithdraw')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('settings.deleteTitle')}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('settings.deleteSubtitle')}</p>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 mb-1">{t('settings.deleteWarning')}</p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>{t('settings.deleteBulletSchedule')}</li>
              <li>{t('settings.deleteBulletEmployees')}</li>
              <li>{t('settings.deleteBulletSubscription')}</li>
              <li>{t('settings.deleteBulletData')}</li>
            </ul>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('settings.deleteConfirmLabel')}
          </label>
          <input
            type="text"
            value={confirmedName}
            onChange={(e) => setConfirmedName(e.target.value)}
            placeholder={t('settings.deleteConfirmPlaceholder')}
            className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            {t('settings.deleteBack')}
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmedName.trim() || loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? t('settings.deleteProcessing') : t('settings.deleteSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
