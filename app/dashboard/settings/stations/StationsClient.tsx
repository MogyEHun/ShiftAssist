'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { createStation, updateStation, deleteStation } from '@/app/actions/stations'
import { Station } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#1a5c3a',
]

interface Props {
  initialStations: Station[]
}

export function StationsClient({ initialStations }: Props) {
  const { t } = useTranslation()
  const [stations, setStations] = useState(initialStations)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    setError(null)
    const result = await createStation(newName.trim(), newColor)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    if (result.data) {
      setStations(prev => [...prev, result.data!])
      setNewName('')
      setNewColor(PRESET_COLORS[0])
      setCreating(false)
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    setError(null)
    const result = await updateStation(id, editName, editColor)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setStations(prev => prev.map(s => s.id === id ? { ...s, name: editName, color: editColor } : s))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm(t('settings.stationConfirmDelete'))) return
    setError(null)
    const result = await deleteStation(id)
    if (result.error) { setError(result.error); return }
    setStations(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>
      )}

      {stations.map(station => (
        <div key={station.id} className="bg-white border border-gray-100 rounded-2xl p-4">
          {editingId === station.id ? (
            <div className="space-y-3">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  {t('common.cancel')}
                </button>
                <button onClick={() => handleUpdate(station.id)} disabled={saving} className="flex-1 px-3 py-1.5 text-sm bg-[#1a5c3a] text-white rounded-lg hover:bg-[#15472e] disabled:opacity-50">
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: station.color }} />
                <p className="text-sm font-medium text-gray-900">{station.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setEditingId(station.id); setEditName(station.name); setEditColor(station.color) }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(station.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {creating ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-4 space-y-3">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={t('settings.stationNamePlaceholder')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
              <X className="h-4 w-4 inline mr-1" />{t('common.cancel')}
            </button>
            <button onClick={handleCreate} disabled={saving || !newName.trim()} className="flex-1 px-3 py-1.5 text-sm bg-[#1a5c3a] text-white rounded-lg hover:bg-[#15472e] disabled:opacity-50">
              <Check className="h-4 w-4 inline mr-1" />{t('settings.stationCreate')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('settings.stationNew')}
        </button>
      )}
    </div>
  )
}
