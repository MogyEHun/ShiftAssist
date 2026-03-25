'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Phone, Lock, Eye, EyeOff, CheckCircle, Download, Shield } from 'lucide-react'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  position: string | null
  avatar_url: string | null
  birth_date: string | null
}

export function MyProfileClient({ profile: initial }: { profile: Profile }) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailNote, setEmailNote] = useState<string | null>(null)

  // Jelszó módosítás state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Profil frissítés szerver action-ön keresztül (titkosítja az adatokat)
    const formData = new FormData()
    formData.set('fullName', profile.full_name)
    formData.set('phone', profile.phone || '')
    formData.set('email', profile.email || '')
    formData.set('birthDate', profile.birth_date || '')

    const res = await fetch('/api/profile/update', {
      method: 'POST',
      body: formData,
    }).then(r => r.json()).catch(() => ({ error: t('common.error') }))

    setSaving(false)
    if (res?.error) { setError(res.error); return }
    setSaved(true)
    if (res?.emailPending) {
      setEmailNote(t('profile.emailPendingNote'))
    }
    setTimeout(() => setSaved(false), 4000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setPwMsg(t('profile.passwordMismatch')); return }
    if (newPassword.length < 8) { setPwMsg(t('profile.passwordTooShort')); return }
    setPwSaving(true)
    setPwMsg(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (err) { setPwMsg(err.message); return }
    setPwMsg(t('profile.passwordChanged'))
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="space-y-5">
      {/* Profil adatok */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-[#1a5c3a]" />
          <h2 className="font-semibold text-gray-900 text-sm">{t('profile.personalData')}</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.fullName')}</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.emailAddress')}</label>
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
            />
          </div>
          {profile.position && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.position')}</label>
              <input
                type="text"
                value={profile.position}
                disabled
                className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                value={profile.phone ?? ''}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="+36 20 123 4567"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.birthDate')}</label>
            <input
              type="date"
              value={profile.birth_date ?? ''}
              onChange={e => setProfile(p => ({ ...p, birth_date: e.target.value || null }))}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {emailNote && <p className="text-sm text-blue-600">{emailNote}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1a5c3a] hover:bg-[#154d30] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {saved ? (
              <><CheckCircle className="h-4 w-4" /> {t('profile.saved')}</>
            ) : saving ? t('common.saving') : t('profile.saveChanges')}
          </button>
        </form>
      </div>

      {/* GDPR – Adataim letöltése */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-[#1a5c3a]" />
          <h2 className="font-semibold text-gray-900 text-sm">{t('profile.gdprTitle')}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {t('profile.gdprText')}
        </p>
        <a
          href="/api/gdpr/export"
          download
          className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          <Download className="h-4 w-4" />
          {t('profile.downloadData')}
        </a>
      </div>

      {/* Jelszó módosítás */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-[#1a5c3a]" />
          <h2 className="font-semibold text-gray-900 text-sm">{t('profile.changePassword')}</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.newPassword')}</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('profile.passwordMinLength')}
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('profile.confirmPassword')}</label>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('profile.passwordRepeat')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a]"
            />
          </div>

          {pwMsg && (
            <p className={`text-sm ${pwMsg === t('profile.passwordChanged') ? 'text-[#1a5c3a]' : 'text-red-600'}`}>
              {pwMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={pwSaving || !newPassword}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            {pwSaving ? t('common.saving') : t('profile.changePassword')}
          </button>
        </form>
      </div>
    </div>
  )
}
