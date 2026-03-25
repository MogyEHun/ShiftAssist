'use client'

import { useState } from 'react'
import { X, Sparkles, BookOpen } from 'lucide-react'
import { LogbookCategory, LOGBOOK_CATEGORY_LABELS, LOGBOOK_CATEGORY_COLORS } from '@/types'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  shiftId: string
  shiftTitle: string
  onClose: () => void
  onSaved: () => void
}

export function LogbookModal({ shiftId, shiftTitle, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<LogbookCategory>('normal')
  const [text, setText] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSummarize() {
    if (!text.trim()) return
    setSummarizing(true)
    setError(null)
    try {
      const res = await fetch('/api/logbook/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.summary) setText(data.summary)
    } catch {
      setError('AI összefoglalás sikertelen')
    }
    setSummarizing(false)
  }

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/logbook/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, category, entry: text }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#1a5c3a]" />
            <h2 className="text-base font-bold text-gray-900">Műszak napló</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">{shiftTitle}</p>

          {/* Kategória */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Kategória</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(LOGBOOK_CATEGORY_LABELS) as LogbookCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    category === cat
                      ? LOGBOOK_CATEGORY_COLORS[cat]
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {LOGBOOK_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Szöveg */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Bejegyzés
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Hogyan telt a műszak? Volt valami fontos esemény?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700 focus:border-transparent resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between p-5 border-t border-gray-100 gap-2">
          <button
            onClick={handleSummarize}
            disabled={!text.trim() || summarizing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {summarizing ? 'AI feldolgozás...' : 'AI összefoglalás'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              Kihagyom
            </button>
            <button
              onClick={handleSave}
              disabled={!text.trim() || saving}
              className="px-4 py-2 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
