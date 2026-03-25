import { redirect } from 'next/navigation'
import { verifySuperAdmin } from '@/app/actions/super-admin'
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const superAdmin = await verifySuperAdmin()

  if (!superAdmin) {
    redirect('/super-admin/login')
  }

  return (
    <SuperAdminShell fullName={superAdmin.full_name}>
      {children}
    </SuperAdminShell>
  )
}
