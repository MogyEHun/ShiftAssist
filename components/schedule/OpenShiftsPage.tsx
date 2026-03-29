'use client'

import { useState } from 'react'
import { ShiftWithAssignee } from '@/types'
import { format, parseISO } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { Briefcase, Clock, MapPin, Plus, Trash2 } from 'lucide-react'
import { claimOpenShift, createOpenShift, deleteOpenShift } from '@/app/actions/open-shifts'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  shifts: ShiftWithAssignee[]
  userRole: string
}

export function OpenShiftsPage({ shifts, userRole }: Props) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu
  const router = useRouter()
  const isManager = ['owner', 'admin', 'manager'].includes(userRole)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Új szabad műszak form state
  const [form, setForm] = useState({
    title: '',
    start_time: '',
    end_time: '',
    required_position: '',
    notes: '',
  })

  async function handleClaim(shiftId: string) {
    setClaiming(shiftId)
    setError(null)
    const result = await claimOpenShift(shiftId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setClaiming(null)
  }

  async function handleDelete(shiftId: string) {
    if (!confirm('Biztosan törlöd ezt a szabad műszakot?')) return
    setDeleting(shiftId)
    setError(null)
    const result = await deleteOpenShift(shiftId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setDeleting(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    const result = await createOpenShift({
      title: form.title,
      start_time: form.start_time,
      end_time: form.end_time,
      required_position: form.required_position || null,
      notes: form.notes || null,
    })
    if (result.error) {
      setError(result.error)
    } else {
      setShowCreate(false)
      setForm({ title: '', start_time: '', end_time: '', required_position: '', notes: '' })
      router.refresh()
    }
    setCreating(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Szabad műszakok</h1>
            <p className="text-sm text-gray-500">
              {isManager ? 'Betöltetlen műszakok – bárki elvállalhatja' : 'Elvállalható szabad műszakok'}
            </p>
          </div>
        </div>
        {isManager && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Új szabad műszak
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Új műszak form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Új szabad műszak</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cím *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700 focus:border-transparent"
                placeholder="pl. Reggeli műszak"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pozíció</label>
              <input
                value={form.required_position}
                onChange={(e) => setForm(p => ({ ...p, required_position: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700 focus:border-transparent"
                placeholder="pl. Pincér"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kezdés *</label>
              <input
                required
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm(p => ({ ...p, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Befejezés *</label>
              <input
                required
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm(p => ({ ...p, end_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Megjegyzés</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-700 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 disabled:opacity-50"
            >
              {creating ? 'Létrehozás...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {shifts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nincs szabad műszak</p>
          {isManager && (
            <p className="text-xs mt-1">Hozz létre egyet a fenti gombbal</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => {
            const start = parseISO(shift.start_time)
            const end = parseISO(shift.end_time)
            const hours = Math.round((end.getTime() - start.getTime()) / 3600000 * 10) / 10

            return (
              <div
                key={shift.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-semibold text-gray-900">{shift.title}</p>
                    {shift.required_position && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {shift.required_position}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(start, 'MMM d. HH:mm', { locale: dfLocale })} – {format(end, 'HH:mm')} ({hours}h)
                    </span>
                    {shift.notes && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shift.notes}
                      </span>
                    )}
                  </div>
                </div>

                {isManager ? (
                  <button
                    onClick={() => handleDelete(shift.id)}
                    disabled={deleting === shift.id}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Törlés"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleClaim(shift.id)}
                    disabled={claiming === shift.id}
                    className="flex-shrink-0 px-4 py-2 bg-[#1a5c3a] text-white rounded-lg text-sm font-medium hover:bg-[#1a5c3a]/90 transition-colors disabled:opacity-50"
                  >
                    {claiming === shift.id ? '...' : 'Elvállalom'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
