'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, LogIn, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { setCompanyStatus, deactivateAllCompanyUsers } from '@/app/actions/super-admin'
import type { CompanyListItem } from '@/app/actions/super-admin'

interface CompaniesTableProps {
  companies: CompanyListItem[]
  actorEmail: string
}

const statusLabel: Record<string, string> = {
  active: 'Aktív',
  trialing: 'Trial',
  canceled: 'Lemondott',
  past_due: 'Lejárt',
}

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trialing: 'bg-amber-100 text-amber-800',
  canceled: 'bg-red-100 text-red-800',
  past_due: 'bg-orange-100 text-orange-800',
}

export function CompaniesTable({ companies, actorEmail }: CompaniesTableProps) {
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const handleActivate = (id: string) => {
    setLoadingId(id)
    startTransition(async () => {
      await setCompanyStatus(id, 'active', actorEmail)
      router.refresh()
      setLoadingId(null)
    })
  }

  const handleDeactivate = (id: string) => {
    setLoadingId(id)
    startTransition(async () => {
      await setCompanyStatus(id, 'canceled', actorEmail)
      router.refresh()
      setLoadingId(null)
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Biztosan deaktiválod az összes felhasználót a(z) "${name}" cégnél? Ez nem vonható vissza könnyen.`)) return
    setLoadingId(id)
    startTransition(async () => {
      await deactivateAllCompanyUsers(id, actorEmail)
      router.refresh()
      setLoadingId(null)
    })
  }

  const handleImpersonate = async (id: string, name: string) => {
    const res = await fetch('/api/super-admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: id, companyName: name }),
    })
    if (res.ok || res.redirected) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Kereső */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Keresés neve vagy slug alapján…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Táblázat */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="px-5 py-3">Cég</th>
              <th className="px-4 py-3">Státusz</th>
              <th className="px-4 py-3">Alkalmazottak</th>
              <th className="px-4 py-3">Regisztráció</th>
              <th className="px-4 py-3 text-right">Műveletek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Nincs találat.
                </td>
              </tr>
            ) : (
              filtered.map((company) => {
                const isLoading = loadingId === company.id && isPending
                const status = company.subscription_status ?? 'canceled'
                return (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <a
                            href={`/admin/companies/${company.id}`}
                            className="font-medium text-slate-800 hover:text-blue-600"
                          >
                            {company.name}
                          </a>
                          <p className="text-xs text-slate-400">{company.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {statusLabel[status] ?? status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{company.employee_count} fő</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(company.created_at).toLocaleDateString('hu-HU')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Belépés cégként */}
                        <button
                          onClick={() => handleImpersonate(company.id, company.name)}
                          disabled={isLoading}
                          title="Belépés cégként"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          <LogIn className="h-4 w-4" />
                        </button>

                        {/* Aktiválás */}
                        {status !== 'active' && (
                          <button
                            onClick={() => handleActivate(company.id)}
                            disabled={isLoading}
                            title="Aktiválás"
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}

                        {/* Deaktiválás */}
                        {status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(company.id)}
                            disabled={isLoading}
                            title="Deaktiválás"
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}

                        {/* Soft törlés */}
                        <button
                          onClick={() => handleDelete(company.id, company.name)}
                          disabled={isLoading}
                          title="Összes user deaktiválása"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        {filtered.length} / {companies.length} cég megjelenítve
      </div>
    </div>
  )
}
