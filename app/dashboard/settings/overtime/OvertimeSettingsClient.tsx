'use client'

import { useState } from 'react'
import { updateOvertimeConfig, upsertOvertimeOverride, deleteOvertimeOverride } from '@/app/actions/companies'
import type { OvertimeOverride, OvertimeEntityType } from '@/app/actions/companies'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface EntityItem { id: string; name: string }

interface Props {
  initialWarning: number
  initialMax: number
  initialOverrides?: OvertimeOverride[]
  sites?: EntityItem[]
  stations?: EntityItem[]
  employees?: EntityItem[]
}

const TABS: { key: OvertimeEntityType; label: string }[] = [
  { key: 'user', label: 'Személyek' },
  { key: 'site', label: 'Telephelyek' },
  { key: 'station', label: 'Állomások' },
]

export function OvertimeSettingsClient({
  initialWarning, initialMax,
  initialOverrides = [], sites = [], stations = [], employees = [],
}: Props) {
  const { t } = useTranslation()
  const [warning, setWarning] = useState(String(initialWarning))
  const [max, setMax] = useState(String(initialMax))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const [overrides, setOverrides] = useState<OvertimeOverride[]>(initialOverrides)
  const [activeTab, setActiveTab] = useState<OvertimeEntityType>('user')
  const [addEntityId, setAddEntityId] = useState('')
  const [addWarning, setAddWarning] = useState('40')
  const [addMax, setAddMax] = useState('48')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleSave() {
    const w = parseInt(warning), m = parseInt(max)
    if (isNaN(w) || isNaN(m)) return
    setLoading(true); setMessage(null)
    const result = await updateOvertimeConfig(w, m)
    setLoading(false)
    setMessage({ text: result.error ?? t('settings.overtimeSaved'), ok: result.success })
  }

  async function handleAddOverride() {
    if (!addEntityId) return
    setAddLoading(true); setAddError(null)
    const w = parseInt(addWarning), m = parseInt(addMax)
    const result = await upsertOvertimeOverride(activeTab, addEntityId, w, m)
    setAddLoading(false)
    if (!result.success) { setAddError(result.error ?? 'Hiba'); return }
    const entityList = activeTab === 'user' ? employees : activeTab === 'site' ? sites : stations
    const entity = entityList.find(e => e.id === addEntityId)
    setOverrides(prev => {
      const filtered = prev.filter(o => !(o.entity_type === activeTab && o.entity_id === addEntityId))
      return [...filtered, { id: Date.now().toString(), entity_type: activeTab, entity_id: addEntityId, weekly_hour_warning: w, weekly_hour_max: m }]
    })
    setAddEntityId(''); setAddWarning('40'); setAddMax('48')
    // Name shown from entity list
    void entity
  }

  async function handleDelete(override: OvertimeOverride) {
    const result = await deleteOvertimeOverride(override.id)
    if (result.success) setOverrides(prev => prev.filter(o => o.id !== override.id))
  }

  function entityName(o: OvertimeOverride) {
    const list = o.entity_type === 'user' ? employees : o.entity_type === 'site' ? sites : stations
    return list.find(e => e.id === o.entity_id)?.name ?? o.entity_id
  }

  const tabOverrides = overrides.filter(o => o.entity_type === activeTab)
  const entityList = activeTab === 'user' ? employees : activeTab === 'site' ? sites : stations

  return (
    <div className="space-y-6">
      {/* Cég-szintű beállítás */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cég-szintű alap</h2>
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">{t('settings.overtimeDescription')}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settings.overtimeWarningLabel')}</label>
            <input type="number" min={1} max={167} value={warning} onChange={e => setWarning(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
            <p className="text-xs text-gray-400 mt-1">{t('settings.overtimeWarningDefault')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('settings.overtimeMaxLabel')}</label>
            <input type="number" min={1} max={168} value={max} onChange={e => setMax(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
            <p className="text-xs text-gray-400 mt-1">{t('settings.overtimeMaxDefault')}</p>
          </div>
        </div>
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
        )}
        <button onClick={handleSave} disabled={loading}
          className="w-full px-4 py-2.5 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50">
          {loading ? t('common.saving') : t('common.save')}
        </button>
      </div>

      {/* Egyéni kivételek */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Egyéni kivételek</h2>
        <p className="text-xs text-gray-400">Az egyéni beállítás felülírja a cég-szintű értéket. Feloldási sorrend: személy &gt; telephely &gt; állomás &gt; cég.</p>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5 border border-gray-200">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-white text-[#1a5c3a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Meglévő override-ok */}
        {tabOverrides.length > 0 && (
          <div className="space-y-2">
            {tabOverrides.map(o => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm font-medium text-gray-800 flex-1">{entityName(o)}</span>
                <span className="text-xs text-gray-500">Figy: <strong>{o.weekly_hour_warning}ó</strong> / Max: <strong>{o.weekly_hour_max}ó</strong></span>
                <button onClick={() => handleDelete(o)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hozzáadás */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600">Új kivétel hozzáadása</p>
          <select value={addEntityId} onChange={e => setAddEntityId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none bg-white">
            <option value="">— Válassz {activeTab === 'user' ? 'személyt' : activeTab === 'site' ? 'telephelyet' : 'állomást'} —</option>
            {entityList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Figyelmeztetés (ó)</label>
              <input type="number" min={1} value={addWarning} onChange={e => setAddWarning(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Maximum (ó)</label>
              <input type="number" min={1} value={addMax} onChange={e => setAddMax(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 outline-none" />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <button onClick={handleAddOverride} disabled={addLoading || !addEntityId}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50">
            <Plus className="h-4 w-4" />
            {addLoading ? 'Mentés...' : 'Hozzáadás'}
          </button>
        </div>
      </div>
    </div>
  )
}
