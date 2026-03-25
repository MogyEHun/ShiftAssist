'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Search, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Log {
  id: string
  action: string
  target_name: string | null
  actor_email: string | null
  created_at: string
}

interface Company {
  id: string
  name: string
}

interface UserResult {
  userId: string
  fullName: string
  companyId: string
  companyName: string
  role: string
  isActive: boolean
}

interface Props {
  logs: Log[]
  companies: Company[]
  userSearchResult: UserResult | null
  initialEmail: string
}

const actionLabel: Record<string, string> = {
  company_activated: 'Cég aktiválva',
  company_deactivated: 'Cég deaktiválva',
  company_soft_deleted: 'Cég soft törölve',
  impersonation_start: 'Impersonation',
  plan_changed: 'Csomag váltva',
  trial_extended: 'Trial hosszabbítva',
  feature_flag_changed: 'Feature flag',
  company_notes_updated: 'Megjegyzés frissítve',
  broadcast_sent: 'Broadcast küldve',
}

const actionColor: Record<string, string> = {
  company_activated: 'bg-green-100 text-green-800',
  company_deactivated: 'bg-red-100 text-red-800',
  company_soft_deleted: 'bg-orange-100 text-orange-800',
  impersonation_start: 'bg-blue-100 text-blue-800',
  plan_changed: 'bg-purple-100 text-purple-800',
  trial_extended: 'bg-amber-100 text-amber-800',
  broadcast_sent: 'bg-indigo-100 text-indigo-800',
}

export function LogsClient({ logs, companies, userSearchResult, initialEmail }: Props) {
  const router = useRouter()
  const [emailInput, setEmailInput] = useState(initialEmail)
  const [selectedCompany, setSelectedCompany] = useState('')

  const handleEmailSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (emailInput) params.set('email', emailInput)
    router.push(`/super-admin/logs?${params.toString()}`)
  }

  const filteredLogs = selectedCompany
    ? logs.filter(l => (l as any).target_id === selectedCompany || (l as any).details?.company_id === selectedCompany)
    : logs

  return (
    <div className="space-y-4">
      {/* Felhasználó keresés */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-500" />
          Felhasználó keresés email alapján
        </h2>
        <form onSubmit={handleEmailSearch} className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="felhasznalo@email.com"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Keresés
          </button>
        </form>

        {initialEmail && (
          <div className="mt-3">
            {userSearchResult ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{userSearchResult.fullName}</p>
                  <p className="text-xs text-slate-500">{userSearchResult.role} · {userSearchResult.companyName} · {userSearchResult.isActive ? 'Aktív' : 'Inaktív'}</p>
                </div>
                <Link
                  href={`/super-admin/companies/${userSearchResult.companyId}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Céghez <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-1">Nem található felhasználó ezzel az email-lel.</p>
            )}
          </div>
        )}
      </div>

      {/* Logok */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Admin műveletek</h2>
          </div>
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="">Összes cég</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Activity className="h-8 w-8 opacity-40" />
            <p>Nincs esemény.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-6 py-3">Esemény</th>
                  <th className="px-4 py-3">Cél</th>
                  <th className="px-4 py-3">Szereplő</th>
                  <th className="px-4 py-3">Dátum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${actionColor[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
                        {actionLabel[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.target_name ?? '–'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.actor_email ?? '–'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('hu-HU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
