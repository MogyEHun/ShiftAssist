import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMonthlyStats, getMonthlyTrends, getLeaveStats } from '@/app/actions/stats'
import { getSites } from '@/app/actions/sites'
import { getCompanyUsers } from '@/lib/data/users'
import { StatsClient } from './StatsClient'
import { format } from 'date-fns'

interface Props {
  searchParams: { month?: string; site?: string; position?: string }
}

export default async function StatsPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const month = searchParams.month ?? format(new Date(), 'yyyy-MM')
  const year = month.slice(0, 4)
  const activeSite = searchParams.site
  const activePosition = searchParams.position

  const [{ stats }, trends, leaveStats, sitesResult, allEmployees] = await Promise.all([
    getMonthlyStats(month, activeSite, activePosition),
    getMonthlyTrends(profile.company_id, 6),
    getLeaveStats(profile.company_id, year),
    getSites(),
    getCompanyUsers(profile.company_id, true),
  ])

  const positions = Array.from(new Set(allEmployees.map(e => e.position).filter((p): p is string => !!p))).sort()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <StatsClient
        stats={stats}
        month={month}
        trends={trends}
        leaveStats={leaveStats}
        sites={sitesResult}
        positions={positions}
        activeSite={activeSite}
        activePosition={activePosition}
      />
    </div>
  )
}
