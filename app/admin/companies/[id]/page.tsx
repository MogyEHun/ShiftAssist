import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Users, LogIn, CheckCircle, XCircle } from 'lucide-react'
import { verifySuperAdmin, getCompanyDetail } from '@/app/actions/super-admin'

interface Props {
  params: { id: string }
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

export default async function SuperAdminCompanyDetailPage({ params }: Props) {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/admin/login')

  const detail = await getCompanyDetail(params.id)
  if (!detail) notFound()

  const { company, users } = detail
  const status = company.subscription_status ?? 'canceled'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Visszagomb */}
      <Link
        href="/admin/companies"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Vissza a cégekhez
      </Link>

      {/* Cég fejléc */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-slate-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <p className="text-slate-400 text-sm">{company.slug}</p>
            </div>
          </div>
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${statusColor[status] ?? 'bg-slate-100 text-slate-700'}`}>
            {statusLabel[status] ?? status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Csomag</p>
            <p className="font-medium text-slate-700">{company.subscription_plan ?? '–'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Regisztráció</p>
            <p className="font-medium text-slate-700">
              {new Date(company.created_at).toLocaleDateString('hu-HU')}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Trial vége</p>
            <p className="font-medium text-slate-700">
              {company.trial_ends_at
                ? new Date(company.trial_ends_at).toLocaleDateString('hu-HU')
                : '–'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Alkalmazottak</p>
            <p className="font-medium text-slate-700">{users.length} fő</p>
          </div>
        </div>

        {/* Impersonation gomb */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <form action={`/api/admin/impersonate`} method="POST">
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="companyName" value={company.name} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Belépés cégként
            </button>
          </form>
        </div>
      </div>

      {/* Alkalmazottak */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <Users className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Alkalmazottak ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3">Név</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Szerepkör</th>
                <th className="px-4 py-3">Pozíció</th>
                <th className="px-4 py-3">Státusz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{user.full_name}</td>
                  <td className="px-4 py-3 text-slate-500">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{user.role}</td>
                  <td className="px-4 py-3 text-slate-600">{user.position ?? '–'}</td>
                  <td className="px-4 py-3">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle className="h-3 w-3" /> Aktív
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <XCircle className="h-3 w-3" /> Inaktív
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Nincs regisztrált felhasználó.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
