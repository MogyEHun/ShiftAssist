import { redirect } from 'next/navigation'
import { verifySuperAdmin, getPlatformStats } from '@/app/actions/super-admin'
import { CompanyGrowthChart } from '@/components/super-admin/CompanyGrowthChart'
import { TopCompaniesChart } from '@/components/super-admin/TopCompaniesChart'

export default async function SuperAdminStatsPage() {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/super-admin/login')

  const { monthlyGrowth, topCompanies } = await getPlatformStats()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform statisztikák</h1>
        <p className="text-slate-500 mt-1">Növekedési trendek és cégek összehasonlítása</p>
      </div>

      {/* Cégek növekedése */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Cégek növekedése (utolsó 12 hónap)</h2>
        {monthlyGrowth.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Nincs elegendő adat a grafikon megjelenítéséhez.</p>
        ) : (
          <CompanyGrowthChart data={monthlyGrowth} />
        )}
      </div>

      {/* Top cégek */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Top 10 cég alkalmazottak szerint</h2>
        {topCompanies.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Nincs elegendő adat a grafikon megjelenítéséhez.</p>
        ) : (
          <TopCompaniesChart data={topCompanies} />
        )}
      </div>

      {/* Összegző adatok */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Legtöbb alkalmazott</p>
          <p className="text-2xl font-bold text-slate-900">{topCompanies[0]?.count ?? 0} fő</p>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{topCompanies[0]?.name ?? '–'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Legjobb hónap (új cégek)</p>
          {(() => {
            const best = [...monthlyGrowth].sort((a, b) => b.new - a.new)[0]
            return (
              <>
                <p className="text-2xl font-bold text-slate-900">{best?.new ?? 0} cég</p>
                <p className="text-sm text-slate-500 mt-0.5">{best?.month ?? '–'}</p>
              </>
            )
          })()}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Összesen a top 10-ben</p>
          <p className="text-2xl font-bold text-slate-900">
            {topCompanies.reduce((sum, c) => sum + c.count, 0)} fő
          </p>
          <p className="text-sm text-slate-500 mt-0.5">top 10 cégben összesen</p>
        </div>
      </div>
    </div>
  )
}
