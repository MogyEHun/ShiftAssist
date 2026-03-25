import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLeaveRequests } from '@/app/actions/leave'
import { getSites } from '@/app/actions/sites'
import { getCompanyUsers } from '@/lib/data/users'
import { LeaveClient } from '@/components/leave/LeaveClient'

export default async function LeavePage({ searchParams }: { searchParams?: { userId?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isManager = ['owner', 'admin', 'manager'].includes(profile.role)

  const [requests, sites, companyUsers] = await Promise.all([
    getLeaveRequests(),
    isManager ? getSites() : Promise.resolve([]),
    isManager ? getCompanyUsers(profile.company_id) : Promise.resolve([]),
  ])
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="flex-1 p-6">
      <LeaveClient
        requests={requests}
        isManager={isManager}
        pendingCount={pendingCount}
        highlightUserId={searchParams?.userId}
        sites={sites}
        users={companyUsers.map(u => ({ id: u.id, full_name: u.full_name, site_id: u.site_id ?? null }))}
        showHeader
      />
    </div>
  )
}
