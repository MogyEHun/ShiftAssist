'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createPosition, deletePosition } from '@/app/actions/positions'
import { Position } from '@/types'

interface Props {
  initialPositions: Position[]
}

export function PositionsClient({ initialPositions }: Props) {
  const [positions, setPositions] = useState(initialPositions)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const result = await createPosition(newName)
    if (result.error) {
      setError(result.error)
    } else {
      setPositions(prev => [...prev, { id: Date.now().toString(), company_id: '', name: newName.trim(), created_at: '', updated_at: '' }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
    }
    setCreating(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Biztosan törlöd a(z) "${name}" pozíciót?`)) return
    const result = await deletePosition(id)
    if (result.error) {
      setError(result.error)
    } else {
      setPositions(prev => prev.filter(p => p.id !== id))
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Pozíciók</h2>
        <p className="text-sm text-gray-500 mt-0.5">Munkakörök kezelése – ezek jelennek meg a beosztásban és az AI tervezőben.</p>
      </div>

      {/* Hozzáadás */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Új pozíció neve (pl. Pincér, Szakács...)"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#1a5c3a] rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {creating ? 'Mentés...' : 'Hozzáadás'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Lista */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {positions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Még nincs pozíció. Adj hozzá egyet fent.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {positions.map(pos => (
              <li key={pos.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-gray-800">{pos.name}</span>
                <button
                  onClick={() => handleDelete(pos.id, pos.name)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Törlés"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
