import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClockToken, getClockEntries, generateQrDataUrl } from '@/app/actions/attendance'
import { getSites } from '@/app/actions/sites'
import { getCompanyUsers } from '@/lib/data/users'
import { QrSelector } from './QrSelector'
import { AttendanceClient } from './AttendanceClient'
import { format } from 'date-fns'

export default async function AttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, company_id, site_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  const today = format(new Date(), 'yyyy-MM-dd')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const canRefresh = ['owner', 'admin'].includes(profile.role)

  const [companyTokenResult, sites, employees, initialEntries] = await Promise.all([
    getClockToken(),
    getSites(),
    getCompanyUsers(profile.company_id, true),
    getClockEntries({ date: today }),
  ])

  // Telephely tokenek párhuzamos lekérése
  const siteTokenResults = await Promise.all(
    sites.map(s => getClockToken(s.id).then(r => ({ siteId: s.id, siteName: s.name, token: r.token })))
  )

  // QR képek generálása
  const companyQrUrl = companyTokenResult.token
    ? await generateQrDataUrl(companyTokenResult.token, baseUrl)
    : ''

  const siteQrPanels = await Promise.all(
    siteTokenResults.map(async s => ({
      ...s,
      qrDataUrl: s.token ? await generateQrDataUrl(s.token, baseUrl) : '',
      clockUrl: s.token ? `${baseUrl}/clock?token=${s.token}` : '',
    }))
  )

  const employeeNames: Record<string, string> = {}
  for (const emp of employees) {
    employeeNames[emp.id] = emp.full_name
  }

  const isMultiSite = sites.length > 0

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="print:hidden">
        <h1 className="text-xl font-bold text-gray-900">Jelenléti napló</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dolgozók be- és kijelentkezési idői</p>
      </div>

      {/* QR kód választó */}
      <QrSelector
        options={[
          ...(!isMultiSite && companyTokenResult.token && companyQrUrl ? [{
            label: company?.name ?? 'Cég',
            qrDataUrl: companyQrUrl,
            companyName: company?.name ?? '',
            clockUrl: `${baseUrl}/clock?token=${companyTokenResult.token}`,
            canRefresh,
          }] : []),
          ...siteQrPanels
            .filter(s => s.token && s.qrDataUrl)
            .map(s => ({
              label: s.siteName,
              qrDataUrl: s.qrDataUrl,
              companyName: company?.name ?? '',
              siteName: s.siteName,
              clockUrl: s.clockUrl,
              siteId: s.siteId,
              canRefresh,
            })),
        ]}
      />

      {/* Jelenléti táblázat */}
      <div className="print:hidden">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Napi bejegyzések</h2>
        <AttendanceClient
          initialEntries={initialEntries}
          initialDate={today}
          employeeNames={employeeNames}
          sites={sites}
          isMultiSite={isMultiSite}
          userRole={profile.role}
          userSiteId={profile.site_id ?? null}
        />
      </div>
    </div>
  )
}
