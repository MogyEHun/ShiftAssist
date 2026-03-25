import { redirect } from 'next/navigation'
import { verifySuperAdmin, getSuperAdmins } from '@/app/actions/super-admin'
import { Shield } from 'lucide-react'
import { AdminsClient } from '@/components/super-admin/AdminsClient'

export default async function SuperAdminAdminsPage() {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/super-admin/login')

  const admins = await getSuperAdmins()

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Super Admin felhasználók</h1>
        <p className="text-slate-500 mt-1">Kik férnek hozzá a platform admin felülethez</p>
      </div>

      <AdminsClient admins={admins} currentAdminId={superAdmin.id} />
    </div>
  )
}
