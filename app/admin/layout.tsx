import { verifySuperAdmin } from '@/app/actions/super-admin'
import { SuperAdminShell } from '@/components/super-admin/SuperAdminShell'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const superAdmin = await verifySuperAdmin()

  // Ha nincs bejelentkezve: a middleware már /login-ra irányít,
  // az /admin/login útvonal publikus – egyszerűen rendereljük a child-ot shell nélkül
  if (!superAdmin) {
    return <>{children}</>
  }

  return (
    <SuperAdminShell fullName={superAdmin.full_name}>
      {children}
    </SuperAdminShell>
  )
}
