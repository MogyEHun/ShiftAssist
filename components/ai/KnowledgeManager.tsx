'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText, X, Check } from 'lucide-react'
import { CompanyKnowledge } from '@/types'
import { createKnowledge, updateKnowledge, deleteKnowledge } from '@/app/actions/knowledge'

const CATEGORIES = ['Szabályzat', 'Folyamat', 'Termék', 'Egyéb']

interface Props {
  initial: CompanyKnowledge[]
}

export function KnowledgeManager({ initial }: Props) {
  const [items, setItems] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<CompanyKnowledge | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])

  function openCreate() {
    setEditItem(null)
    setTitle('')
    setContent('')
    setCategory(CATEGORIES[0])
    setError(null)
    setShowModal(true)
  }

  function openEdit(item: CompanyKnowledge) {
    setEditItem(item)
    setTitle(item.title)
    setContent(item.content)
    setCategory(item.category ?? CATEGORIES[0])
    setError(null)
    setShowModal(true)
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError('Cím és tartalom kötelező')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editItem) {
        await updateKnowledge(editItem.id, { title, content, category })
        setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...i, title, content, category } : i))
      } else {
        const created = await createKnowledge(title, content, category)
        setItems((prev) => [created, ...prev])
      }
      setShowModal(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    try {
      await deleteKnowledge(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      setDeleteId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Fejléc + gomb */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {items.length} dokumentum · Az AI asszisztens ezek alapján válaszol
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a5c3a] text-white text-sm font-medium rounded-xl hover:bg-[#15472e] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Új dokumentum
        </button>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Még nincsenek dokumentumok</p>
          <p className="text-xs mt-1 opacity-70">Töltsd fel a céges szabályzatokat, folyamatokat, termékleírásokat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a5c3a]/10 text-[#1a5c3a] font-medium">
                      {item.category ?? 'Általános'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Szerkesztés"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Törlés"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Törlés megerősítés */}
              {deleteId === item.id && (
                <div className="mt-3 flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <span className="flex-1 text-red-700">Biztosan törlöd?</span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> Igen
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-colors"
                  >
                    <X className="h-3 w-3" /> Mégse
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editItem ? 'Dokumentum szerkesztése' : 'Új dokumentum'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Kategória */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategória</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Cím */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cím</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="pl. Öltözési szabályzat"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
                />
              </div>

              {/* Tartalom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tartalom</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Írd le a dokumentum tartalmát..."
                  rows={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1a5c3a] rounded-xl hover:bg-[#15472e] transition-colors disabled:opacity-50"
              >
                {saving ? 'Mentés...' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
