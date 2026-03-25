import { redirect } from 'next/navigation'
import { verifySuperAdmin, getRevenueStats } from '@/app/actions/super-admin'
import { TrendingUp, DollarSign, Users, TrendingDown } from 'lucide-react'
import { RevenueChart } from '@/components/super-admin/RevenueChart'

function formatHUF(n: number) {
  return n.toLocaleString('hu-HU') + ' Ft'
}

export default async function SuperAdminRevenuePage() {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/super-admin/login')

  const stats = await getRevenueStats()

  const cards = [
    { label: 'MRR', value: formatHUF(stats.mrr), icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'ARR', value: formatHUF(stats.arr), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Átlag / cég', value: formatHUF(stats.avgPerCompany), icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Churn (30 nap)', value: `${stats.churnCount} cég`, icon: TrendingDown, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Revenue</h1>
        <p className="text-slate-500 mt-1">Bevételi áttekintő</p>
      </div>

      {/* Stat kártyák */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
            <p className="text-slate-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Havi bevétel (elmúlt 12 hónap)</h2>
        <RevenueChart data={stats.monthlyRevenue} />
      </div>

      {/* Top cégek */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Top 10 cég bevétel szerint</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-6 py-3">#</th>
                <th className="px-4 py-3">Cég</th>
                <th className="px-4 py-3">Csomag</th>
                <th className="px-4 py-3 text-right">Összbevétel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.topCompanies.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">{c.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatHUF(c.amount)}</td>
                </tr>
              ))}
              {stats.topCompanies.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Még nincs számlázási adat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
