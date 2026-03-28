import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StaffClient } from '@/components/staff/StaffClient'
import { getCompanyUsers } from '@/lib/data/users'
import { getSites } from '@/app/actions/sites'
import { getStations } from '@/app/actions/stations'
import { StationsClient } from '@/app/dashboard/settings/stations/StationsClient'
import { SitesClient } from '@/app/dashboard/settings/sites/SitesClient'
import { ReliabilityClient } from '@/components/staff/ReliabilityClient'
import { getReliabilityStats } from '@/app/actions/reliability'
import { PositionsClient } from '@/components/staff/PositionsClient'
import { getPositions } from '@/app/actions/positions'
import { Info } from 'lucide-react'

interface Props {
  searchParams: { view?: string }
}

export default async function StaffPage({ searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id, role, site_id')
    .eq('id', user.id)
    .single()

  if (!currentUser) redirect('/login')

  const isPrivileged = ['owner', 'admin', 'manager'].includes(currentUser.role)
  const isOwnerOrAdmin = ['owner', 'admin'].includes(currentUser.role)

  const validViews = ['staff', 'sites', 'stations', 'reliability', 'positions']
  const view = validViews.includes(searchParams.view ?? '') ? (searchParams.view as string) : 'staff'

  // ------- POZÍCIÓK NÉZET -------
  if (view === 'positions' && isPrivileged) {
    const positions = await getPositions()
    return (
      <div className="px-6 pt-6 pb-6">
        <PositionsClient initialPositions={positions} />
      </div>
    )
  }

  // ------- MEGBÍZHATÓSÁG NÉZET -------
  if (view === 'reliability' && isPrivileged) {
    const reliabilityStats = await getReliabilityStats(currentUser.company_id, 3)
    return (
      <div className="px-6 pt-6 pb-6">
        <ReliabilityClient stats={reliabilityStats} />
      </div>
    )
  }

  // ------- ÁLLOMÁSOK NÉZET -------
  if (view === 'stations' && isPrivileged) {
    const stations = await getStations()
    return (
      <div className="px-6 pt-6 pb-6">
        <div className="max-w-2xl">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Állomások</h1>
            <p className="text-sm text-gray-500 mt-0.5">Munkakörök és részlegek kezelése</p>
          </div>
          <StationsClient initialStations={stations} />
        </div>
      </div>
    )
  }

  // ------- TELEPHELYEK NÉZET -------
  if (view === 'sites' && isOwnerOrAdmin) {
    const [sites, employees] = await Promise.all([
      getSites(),
      getCompanyUsers(currentUser.company_id, true),
    ])
    const unassignedCount = employees.filter(e => !e.site_id).length
    return (
      <div className="px-6 pt-6 pb-6">
        <div className="max-w-2xl space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Telephelyek</h1>
            <p className="text-sm text-gray-500 mt-0.5">Helyszínek és hozzárendelések kezelése</p>
          </div>
          {unassignedCount > 0 && sites.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{unassignedCount} dolgozónak még nincs telephelye – rendeld hozzá őket.</span>
            </div>
          )}
          <SitesClient
            initialSites={sites}
            employees={employees.map(e => ({ id: e.id, full_name: e.full_name, site_id: e.site_id ?? null, role: e.role }))}
          />
        </div>
      </div>
    )
  }

  // ------- SZEMÉLYZET NÉZET (alapértelmezett) -------
  const [staffList, positions, sites] = await Promise.all([
    getCompanyUsers(currentUser.company_id),
    supabase.from('positions').select('id, name').eq('company_id', currentUser.company_id).order('name'),
    isOwnerOrAdmin ? getSites() : Promise.resolve([]),
  ])

  const defaultSiteFilter = currentUser.role === 'manager' ? (currentUser.site_id ?? '') : ''

  const filteredStaff = staffList.map((u) => ({
    ...u,
    hourly_rate: isPrivileged ? u.hourly_rate : null,
  }))

  return (
    <StaffClient
      staff={filteredStaff}
      positions={positions.data ?? []}
      currentUserId={user.id}
      currentUserRole={currentUser.role}
      isPrivileged={isPrivileged}
      sites={sites}
      defaultSiteFilter={defaultSiteFilter}
    />
  )
}
