import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOvertimeConfig, getOvertimeOverrides } from '@/app/actions/companies'
import { getSites } from '@/app/actions/sites'
import { getStations } from '@/app/actions/stations'
import { getCompanyUsers } from '@/lib/data/users'
import { OvertimeSettingsClient } from './OvertimeSettingsClient'

export default async function OvertimeSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const [config, overrides, sites, stations, employees] = await Promise.all([
    getOvertimeConfig(),
    getOvertimeOverrides(),
    getSites(),
    getStations(),
    getCompanyUsers(profile.company_id, true),
  ])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Túlóra beállítások</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cég-szintű alapbeállítás, és egyéni kivételek személyenként, telephelyenként vagy állomásonként.
        </p>
      </div>
      <OvertimeSettingsClient
        initialWarning={config?.weekly_hour_warning ?? 40}
        initialMax={config?.weekly_hour_max ?? 48}
        initialOverrides={overrides}
        sites={sites.map(s => ({ id: s.id, name: s.name }))}
        stations={stations.map(s => ({ id: s.id, name: s.name }))}
        employees={employees.map(e => ({ id: e.id, name: e.full_name }))}
      />
    </div>
  )
}
