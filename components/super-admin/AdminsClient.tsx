'use client'

import { useState, useTransition } from 'react'
import { Shield, Trash2, UserPlus } from 'lucide-react'
import { addSuperAdmin, removeSuperAdmin } from '@/app/actions/super-admin'

interface Admin {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

interface Props {
  admins: Admin[]
  currentAdminId: string
}

export function AdminsClient({ admins: initial, currentAdminId }: Props) {
  const [admins, setAdmins] = useState(initial)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAdd = () => {
    if (!email.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addSuperAdmin(email.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Admin hozzáadva. Frissítsd az oldalt a lista frissítéséhez.')
        setEmail('')
      }
    })
  }

  const handleRemove = (id: string) => {
    startTransition(async () => {
      const result = await removeSuperAdmin(id)
      if (result.error) {
        setError(result.error)
      } else {
        setAdmins(prev => prev.filter(a => a.id !== id))
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Hozzáadás */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Admin hozzáadása</h2>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          A felhasználónak már regisztrálva kell lennie az appban (munkavállalóként vagy ownerként).
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="felhasznalo@email.com"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !email.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Hozzáadás
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <Shield className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Jelenlegi adminok ({admins.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {admins.map(admin => (
            <div key={admin.id} className="flex items-center justify-between px-6 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{admin.full_name ?? '–'}</p>
                <p className="text-xs text-slate-500">{admin.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-400">{new Date(admin.created_at).toLocaleDateString('hu-HU')}</p>
                {admin.id === currentAdminId ? (
                  <span className="text-xs text-blue-600 font-medium">Te</span>
                ) : (
                  <button
                    onClick={() => handleRemove(admin.id)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {admins.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-slate-400">Nincs super admin.</p>
          )}
        </div>
      </div>
    </div>
  )
}
