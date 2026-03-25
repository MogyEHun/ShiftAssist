'use client'

import { useState } from 'react'
import { X, AlertCircle, Users, Check } from 'lucide-react'
import { createTask } from '@/app/actions/tasks'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Employee {
  id: string
  full_name: string
  position: string | null
}

interface Props {
  employees: Employee[]
  onSave: () => void
  onClose: () => void
}

export function TaskCreateModal({ employees, onSave, onClose }: Props) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'normal' | 'high'>('normal')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleEmployee(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedIds(prev =>
      prev.length === employees.length ? [] : employees.map(e => e.id)
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    const result = await createTask({
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      priority,
      assignedUserIds: selectedIds,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onSave()
      onClose()
    }
  }

  const allSelected = selectedIds.length === employees.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Fejléc */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{t('tasks.modalTitle')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Cím */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.nameLabel')}</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('tasks.namePlaceholder')}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
              />
            </div>

            {/* Leírás */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.descLabel')}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('tasks.descPlaceholder')}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none resize-none"
              />
            </div>

            {/* Határidő + Prioritás sor */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.dueDateLabel')}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tasks.priority')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      priority === 'normal'
                        ? 'bg-gray-100 border-gray-300 text-gray-700'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {t('tasks.normal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      priority === 'high'
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t('tasks.high')}
                  </button>
                </div>
              </div>
            </div>

            {/* Személyek */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {t('tasks.assignTo')}
                  {selectedIds.length > 0 && (
                    <span className="text-xs text-[#1a5c3a] font-semibold">({selectedIds.length} {t('tasks.selected')})</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-[#1a5c3a] hover:underline font-medium"
                >
                  {allSelected ? t('tasks.clearAll') : t('tasks.everyone')}
                </button>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {employees.map(emp => {
                  const isSelected = selectedIds.includes(emp.id)
                  const initials = emp.full_name.slice(0, 2).toUpperCase()
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmployee(emp.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-gray-100 last:border-0 ${
                        isSelected ? 'bg-[#1a5c3a]/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected ? 'bg-[#1a5c3a] text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{emp.full_name}</div>
                        {emp.position && <div className="text-xs text-gray-400">{emp.position}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
              {selectedIds.length === 0 && (
                <p className="text-xs text-gray-400 mt-1.5">{t('tasks.unassignedNote')}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-5 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-xl hover:bg-[#15472e] disabled:opacity-50 transition-colors"
            >
              {loading ? t('common.saving') : selectedIds.length > 1 ? `${t('tasks.issueTo').replace('{n}', String(selectedIds.length))}` : t('tasks.issueTask')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
