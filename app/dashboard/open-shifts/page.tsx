import { getOpenShifts } from '@/app/actions/open-shifts'
import { OpenShiftsPage } from '@/components/schedule/OpenShiftsPage'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OpenShiftsRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user!.id)
    .single()

  const openShifts = await getOpenShifts()

  return (
    <OpenShiftsPage
      shifts={openShifts}
      userRole={profile?.role ?? 'employee'}
    />
  )
}
