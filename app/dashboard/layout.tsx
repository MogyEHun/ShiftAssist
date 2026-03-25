import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { ImpersonationBanner } from '@/components/super-admin/ImpersonationBanner'
import { GracePeriodBanner } from '@/components/billing/GracePeriodBanner'
import { decrypt } from '@/lib/encryption'

// Dashboard layout — szerver oldali user/cég adat lekérés
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Impersonation cookie ellenőrzés
  const cookieStore = cookies()
  const impersonateCookie = cookieStore.get('sa_view_company')
  let impersonatedCompany: { id: string; name: string } | null = null

  if (impersonateCookie) {
    try {
      impersonatedCompany = JSON.parse(impersonateCookie.value)
    } catch {}
  }

  let companyName: string
  let userFullName: string
  let userRole: string
  let subscriptionStatus: string | null = null

  if (impersonatedCompany) {
    // Super admin impersonation módban: admin client-tel kérjük le a cég nevét
    const admin = createAdminClient()
    const { data: companyData } = await admin
      .from('companies')
      .select('name')
      .eq('id', impersonatedCompany.id)
      .single()
    companyName = companyData?.name ?? impersonatedCompany.name
    userFullName = 'Super Admin'
    userRole = 'manager'
  } else {
    const { data: userData } = await supabase
      .from('users')
      .select('full_name_encrypted, role, companies(name, subscription_status)')
      .eq('id', user.id)
      .single()

    const companyInfo = userData?.companies as unknown as { name: string; subscription_status: string } | null
    companyName = companyInfo?.name ?? 'ShiftAssist'
    userFullName = userData?.full_name_encrypted ? decrypt(userData.full_name_encrypted) : ''
    userRole = userData?.role ?? 'employee'
    subscriptionStatus = companyInfo?.subscription_status ?? null

    // Employee-k nem láthatják a dashboard-ot → /my-ra irányítjuk
    if (userRole === 'employee') redirect('/my')
  }

  return (
    <>
      {impersonatedCompany && (
        <ImpersonationBanner companyName={impersonatedCompany.name} />
      )}
      {subscriptionStatus === 'past_due' && (
        <GracePeriodBanner />
      )}
      <DashboardShell
        companyName={companyName}
        userFullName={userFullName}
        userRole={userRole}
      >
        {children}
      </DashboardShell>
    </>
  )
}
