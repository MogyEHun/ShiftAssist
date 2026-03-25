'use client'

import { useState } from 'react'
import { setup2FA, confirmSetup2FA, disable2FA } from '@/app/actions/two-factor'
import { Shield, ShieldCheck, ShieldOff, AlertCircle, Copy, Check } from 'lucide-react'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  initialEnabled: boolean
}

type Phase = 'idle' | 'setup' | 'confirm' | 'backupCodes' | 'disable'

export function TwoFactorClient({ initialEnabled }: Props) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [phase, setPhase] = useState<Phase>('idle')
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function startSetup() {
    setLoading(true)
    setError(null)
    const result = await setup2FA()
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setQrCodeUrl(result.qrCodeUrl ?? null)
    setPhase('setup')
  }

  async function handleConfirm() {
    if (!token) return
    setLoading(true)
    setError(null)
    const result = await confirmSetup2FA(token)
    setLoading(false)
    if (!result.success) { setError(result.error ?? 'Error'); return }
    setBackupCodes(result.backupCodes ?? [])
    setEnabled(true)
    setToken('')
    setPhase('backupCodes')
  }

  async function handleDisable() {
    if (!token) return
    setLoading(true)
    setError(null)
    const result = await disable2FA(token)
    setLoading(false)
    if (!result.success) { setError(result.error ?? 'Error'); return }
    setEnabled(false)
    setToken('')
    setPhase('idle')
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadBackupCodes() {
    const content = `ShiftAssist – ${t('settings.twoFactorSaveBackupCodes')}\n\n${backupCodes.join('\n')}\n\n${t('settings.twoFactorBackupCodesDesc')}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'syncshift-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 max-w-lg">
      {/* Status */}
      <div className="flex items-center gap-3">
        {enabled
          ? <ShieldCheck className="h-6 w-6 text-green-600 flex-shrink-0" />
          : <Shield className="h-6 w-6 text-gray-400 flex-shrink-0" />
        }
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {enabled ? t('settings.twoFactorActive') : t('settings.twoFactorInactive')}
          </p>
          <p className="text-xs text-gray-500">
            {enabled ? t('settings.twoFactorActiveDesc') : t('settings.twoFactorInactiveDesc')}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* QR scan */}
      {phase === 'setup' && qrCodeUrl && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{t('settings.twoFactorScanQr')}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeUrl} alt="QR code" className="w-48 h-48 mx-auto rounded-xl border border-gray-200" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('settings.twoFactorEnterCode')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-mono tracking-widest focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPhase('idle'); setToken(''); setError(null) }}
              className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || token.length < 6}
              className="flex-1 py-2 text-sm font-medium text-white bg-[#1a5c3a] rounded-xl hover:bg-[#15472e] transition-colors disabled:opacity-50"
            >
              {loading ? t('settings.twoFactorVerifying') : t('settings.twoFactorActivate')}
            </button>
          </div>
        </div>
      )}

      {/* Backup codes */}
      {phase === 'backupCodes' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-amber-800 mb-1">{t('settings.twoFactorSaveBackupCodes')}</p>
            <p className="text-xs text-amber-700">{t('settings.twoFactorBackupCodesDesc')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map(code => (
              <code key={code} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-center text-gray-800">
                {code}
              </code>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyBackupCodes}
              className="flex items-center justify-center gap-1.5 flex-1 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? t('settings.twoFactorCopied') : t('settings.twoFactorCopy')}
            </button>
            <button
              onClick={downloadBackupCodes}
              className="flex-1 py-2 text-sm font-medium text-white bg-[#1a5c3a] rounded-xl hover:bg-[#15472e] transition-colors"
            >
              {t('settings.twoFactorDownload')}
            </button>
          </div>
          <button
            onClick={() => setPhase('idle')}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('settings.twoFactorDone')}
          </button>
        </div>
      )}

      {/* Disable */}
      {phase === 'disable' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{t('settings.twoFactorDisablePrompt')}</p>
          <input
            type="text"
            inputMode="numeric"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="000000"
            maxLength={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-mono tracking-widest focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setPhase('idle'); setToken(''); setError(null) }}
              className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDisable}
              disabled={loading || token.length < 6}
              className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? t('settings.twoFactorDisabling') : t('settings.twoFactorDisable')}
            </button>
          </div>
        </div>
      )}

      {/* Idle – buttons */}
      {phase === 'idle' && (
        enabled ? (
          <button
            onClick={() => { setPhase('disable'); setError(null) }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
          >
            <ShieldOff className="h-4 w-4" />
            {t('settings.twoFactorDisableBtn')}
          </button>
        ) : (
          <button
            onClick={startSetup}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1a5c3a] rounded-xl hover:bg-[#15472e] transition-colors disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            {loading ? t('settings.twoFactorStarting') : t('settings.twoFactorEnable')}
          </button>
        )
      )}
    </div>
  )
}
