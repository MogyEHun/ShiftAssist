import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getSites } from '@/app/actions/sites'
import { getCompanyUsers } from '@/lib/data/users'
import { SitesClient } from './SitesClient'
import { getLocale, getT } from '@/lib/i18n'

export default async function SitesPage() {
  const t = getT(getLocale())
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const [sites, employees] = await Promise.all([
    getSites(),
    getCompanyUsers(profile.company_id, true),
  ])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link href="/dashboard/schedule?view=sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t('nav.settings')}
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{t('settings.sites')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('settings.sitesDesc')}</p>
      </div>
      <SitesClient
        initialSites={sites}
        employees={employees.map(e => ({ id: e.id, full_name: e.full_name, site_id: e.site_id ?? null, role: e.role }))}
      />
    </div>
  )
}
