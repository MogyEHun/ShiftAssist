'use client'

import { useState, useTransition } from 'react'
import { Settings, StickyNote, Zap, Download, CheckCircle2, XCircle } from 'lucide-react'
import {
  changePlan, extendTrial, setCompanyStatus,
  updateCompanyNotes, setFeatureFlag, exportCompanyData,
} from '@/app/actions/super-admin'
import { FEATURE_FLAGS } from '@/lib/feature-flags'

interface Props {
  companyId: string
  currentPlan: 'basic' | 'premium'
  currentStatus: 'active' | 'trialing' | 'canceled' | 'past_due'
  internalNotes: string
  featureFlags: Record<string, boolean>
  actorEmail: string
}

export function CompanyDetailActions({ companyId, currentPlan, currentStatus, internalNotes, featureFlags, actorEmail }: Props) {
  const [isPending, startTransition] = useTransition()
  const [plan, setPlan] = useState(currentPlan)
  const [status, setStatus] = useState(currentStatus)
  const [notes, setNotes] = useState(internalNotes)
  const [flags, setFlags] = useState(featureFlags)
  const [toast, setToast] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handlePlanChange = (newPlan: 'basic' | 'premium') => {
    setPlan(newPlan)
    startTransition(async () => {
      await changePlan(companyId, newPlan)
      showToast('Csomag frissítve.')
    })
  }

  const handleExtendTrial = (days: number) => {
    startTransition(async () => {
      await extendTrial(companyId, days)
      showToast(`Trial meghosszabbítva ${days} nappal.`)
    })
  }

  const handleStatusChange = (newStatus: 'active' | 'canceled') => {
    setStatus(newStatus)
    startTransition(async () => {
      await setCompanyStatus(companyId, newStatus, actorEmail)
      showToast('Státusz frissítve.')
    })
  }

  const handleSaveNotes = () => {
    startTransition(async () => {
      await updateCompanyNotes(companyId, notes)
      showToast('Megjegyzések mentve.')
    })
  }

  const handleFlagToggle = (flag: string, enabled: boolean) => {
    setFlags(prev => ({ ...prev, [flag]: enabled }))
    startTransition(async () => {
      await setFeatureFlag(companyId, flag, enabled)
    })
  }

  const handleExport = async () => {
    setExporting(true)
    const data = await exportCompanyData(companyId)
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `company-export-${companyId}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Előfizetés kezelés */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Előfizetés kezelés</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Plan váltás */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Csomag</p>
            <div className="flex gap-2">
              {(['basic', 'premium'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => handlePlanChange(p)}
                  disabled={isPending || plan === p}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    plan === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Trial hosszabbítás */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Trial meghosszabbítás</p>
            <div className="flex gap-2">
              {[7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => handleExtendTrial(days)}
                  disabled={isPending}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  +{days} nap
                </button>
              ))}
            </div>
          </div>

          {/* Státusz */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Státusz</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange('active')}
                disabled={isPending || status === 'active'}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === 'active' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Aktív
              </button>
              <button
                onClick={() => handleStatusChange('canceled')}
                disabled={isPending || status === 'canceled'}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === 'canceled' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <XCircle className="h-3.5 w-3.5" /> Lemondott
              </button>
            </div>
          </div>

          {/* Export */}
          <div>
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Adatexport</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exportálás...' : 'JSON letöltés'}
            </button>
          </div>
        </div>
      </div>

      {/* Feature flags */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Feature flags</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(FEATURE_FLAGS).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
              <span className="text-sm text-slate-700">{label}</span>
              <button
                role="switch"
                aria-checked={flags[key] ?? false}
                onClick={() => handleFlagToggle(key, !(flags[key] ?? false))}
                disabled={isPending}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  flags[key] ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  flags[key] ? 'translate-x-4' : 'translate-x-1'
                }`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Belső megjegyzések */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <StickyNote className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Belső megjegyzések</h2>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Belső feljegyzések a cégről (pl. különleges ár, kapcsolattartó, megjegyzések)..."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-700 placeholder:text-slate-300"
        />
        <button
          onClick={handleSaveNotes}
          disabled={isPending}
          className="mt-3 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Mentés
        </button>
      </div>
    </div>
  )
}
