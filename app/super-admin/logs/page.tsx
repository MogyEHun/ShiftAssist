import { redirect } from 'next/navigation'
import { verifySuperAdmin, getSystemLogs, getAllCompanies, searchUserByEmail } from '@/app/actions/super-admin'
import { LogsClient } from '@/components/super-admin/LogsClient'

export default async function SuperAdminLogsPage({
  searchParams,
}: {
  searchParams: { company?: string; email?: string }
}) {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/super-admin/login')

  const [logs, companies] = await Promise.all([
    getSystemLogs(100),
    getAllCompanies(),
  ])

  const userSearchResult = searchParams.email
    ? await searchUserByEmail(searchParams.email)
    : undefined

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rendszer logok</h1>
        <p className="text-slate-500 mt-1">Utolsó {logs.length} admin művelet</p>
      </div>

      <LogsClient
        logs={logs}
        companies={companies.map(c => ({ id: c.id, name: c.name }))}
        userSearchResult={userSearchResult ?? null}
        initialEmail={searchParams.email ?? ''}
      />
    </div>
  )
}
