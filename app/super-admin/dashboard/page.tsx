import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, TrendingUp, AlertCircle, Clock, Activity } from 'lucide-react'
import { verifySuperAdmin, getSuperAdminStats, getAllCompanies } from '@/app/actions/super-admin'

export default async function SuperAdminDashboardPage() {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/super-admin/login')

  const [stats, companies] = await Promise.all([
    getSuperAdminStats(),
    getAllCompanies(),
  ])

  const recentCompanies = companies.slice(0, 5)

  const statCards = [
    {
      label: 'Összes cég',
      value: stats.totalCompanies,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Összes felhasználó',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Aktív előfizetés',
      value: stats.activeCompanies,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Trial időszak',
      value: stats.trialCompanies,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Lemondott',
      value: stats.inactiveCompanies,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Új cég (30 nap)',
      value: stats.newCompanies,
      icon: Activity,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Fejléc */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform áttekintés</h1>
        <p className="text-slate-500 mt-1">Üdvözöllek, {superAdmin.full_name ?? superAdmin.email}!</p>
      </div>

      {/* Stat kártyák */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legutóbbi cégek */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Legutóbbi regisztrációk</h2>
          <Link
            href="/super-admin/companies"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Összes cég →
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentCompanies.length === 0 ? (
            <p className="px-6 py-8 text-center text-slate-400">Még nincs regisztrált cég.</p>
          ) : (
            recentCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/super-admin/companies/${company.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{company.name}</p>
                    <p className="text-xs text-slate-400">
                      {company.employee_count} alkalmazott · {new Date(company.created_at).toLocaleDateString('hu-HU')}
                    </p>
                  </div>
                </div>
                <span
                  className={`ml-3 flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                    statusColor[company.subscription_status ?? 'canceled'] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {statusLabel[company.subscription_status ?? ''] ?? company.subscription_status}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
