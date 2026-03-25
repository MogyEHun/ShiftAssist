import { redirect } from 'next/navigation'
import { verifySuperAdmin } from '@/app/actions/super-admin'
import { BroadcastClient } from '@/components/super-admin/BroadcastClient'

export default async function SuperAdminBroadcastPage() {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/super-admin/login')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Broadcast email</h1>
        <p className="text-slate-500 mt-1">Email küldése az összes vagy szűrt cégek owner felhasználóinak</p>
      </div>
      <BroadcastClient />
    </div>
  )
}
