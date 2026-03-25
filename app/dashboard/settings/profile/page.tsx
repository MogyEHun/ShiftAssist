'use client'

import { useState } from 'react'
import { updateMyProfile, changePassword } from '@/app/actions/auth'
import { useTranslation } from '@/components/providers/LanguageProvider'

export default function ProfileSettingsPage() {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok?: string; error?: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok?: string; error?: string } | null>(null)

  async function handleNameSave() {
    if (!fullName.trim()) return
    setNameLoading(true)
    setNameMsg(null)
    const result = await updateMyProfile(fullName)
    setNameMsg(result.error ? { error: result.error } : { ok: t('settings.profileNameSaved') })
    setNameLoading(false)
  }

  async function handlePasswordSave() {
    if (newPassword.length < 8) {
      setPwMsg({ error: t('settings.profilePasswordShort') })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ error: t('settings.profilePasswordMismatch') })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const result = await changePassword(newPassword)
    if (result.error) {
      setPwMsg({ error: result.error })
    } else {
      setPwMsg({ ok: t('settings.profilePasswordSaved') })
      setNewPassword('')
      setConfirmPassword('')
    }
    setPwLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('settings.profileTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('settings.profileSubtitle')}</p>
      </div>

      {/* Name */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t('settings.profileFullName')}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settings.profileNewName')}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('settings.profileNamePlaceholder')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />
        </div>
        {nameMsg?.error && <p className="text-sm text-red-600">{nameMsg.error}</p>}
        {nameMsg?.ok && <p className="text-sm text-green-600">{nameMsg.ok}</p>}
        <button
          onClick={handleNameSave}
          disabled={!fullName.trim() || nameLoading}
          className="px-4 py-2 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 disabled:opacity-50"
        >
          {nameLoading ? t('common.saving') : t('settings.profileSaveName')}
        </button>
      </div>

      {/* Password */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t('settings.profileChangePassword')}</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settings.profileNewPassword')}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('settings.profilePasswordMin')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settings.profileConfirmPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('settings.profilePasswordRepeat')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />
        </div>
        {pwMsg?.error && <p className="text-sm text-red-600">{pwMsg.error}</p>}
        {pwMsg?.ok && <p className="text-sm text-green-600">{pwMsg.ok}</p>}
        <button
          onClick={handlePasswordSave}
          disabled={!newPassword || !confirmPassword || pwLoading}
          className="px-4 py-2 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 disabled:opacity-50"
        >
          {pwLoading ? t('common.saving') : t('settings.profileSavePassword')}
        </button>
      </div>
    </div>
  )
}
