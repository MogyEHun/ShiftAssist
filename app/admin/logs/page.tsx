import { redirect } from 'next/navigation'
import { verifySuperAdmin, getSystemLogs, getCompanyActivityLogs } from '@/app/actions/super-admin'
import { Activity, Bot } from 'lucide-react'
import Link from 'next/link'
import { LogsDateFilter } from './LogsDateFilter'

const ACTION_LABELS: Record<string, string> = {
  company_activated: 'Cég aktiválva',
  company_deactivated: 'Cég deaktiválva',
  company_soft_deleted: 'Cég törölve',
  'shift.create': 'Műszak létrehozva',
  'shift.update': 'Műszak módosítva',
  'shift.delete': 'Műszak törölve',
  'shift.move': 'Műszak áthelyezve',
  'shifts.publish': 'Beosztás publikálva',
  'open_shift.create': 'Nyílt műszak létrehozva',
  'open_shift.claimed': 'Nyílt műszak elvállalva',
  'leave.create': 'Szabadság kérelem',
  'leave.resolved': 'Szabadság elbírálva',
  'swap.resolved': 'Műszak csere elbírálva',
  'staff.invite': 'Meghívó elküldve',
  'staff.invite_link': 'Meghívó link generálva',
  'staff.activate': 'Dolgozó aktiválva',
  'staff.deactivate': 'Dolgozó deaktiválva',
  'department.create': 'Részleg létrehozva',
  'department.delete': 'Részleg törölve',
  'task.create': 'Feladat létrehozva',
  'task.delete': 'Feladat törölve',
  'account.deletion_requested': 'Fiók törlés kérve',
  'account.deletion_cancelled': 'Fiók törlés visszavonva',
  'ai.schedule_request': 'AI beosztás generálás',
  'email.failed': 'Email küldés sikertelen',
}

const ACTION_COLORS: Record<string, string> = {
  company_activated: 'bg-green-100 text-green-800',
  company_deactivated: 'bg-red-100 text-red-800',
  company_soft_deleted: 'bg-orange-100 text-orange-800',
  'shift.delete': 'bg-red-50 text-red-700',
  'shifts.publish': 'bg-green-50 text-green-700',
  'leave.create': 'bg-blue-50 text-blue-700',
  'leave.resolved': 'bg-blue-100 text-blue-800',
  'staff.invite': 'bg-purple-50 text-purple-700',
  'staff.deactivate': 'bg-red-50 text-red-700',
  'staff.activate': 'bg-green-50 text-green-700',
  'account.deletion_requested': 'bg-orange-100 text-orange-800',
  'ai.schedule_request': 'bg-violet-100 text-violet-800',
  'email.failed': 'bg-red-100 text-red-800',
}

export default async function SuperAdminLogsPage({
  searchParams,
}: {
  searchParams: { tab?: string; from?: string; to?: string }
}) {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) redirect('/admin/login')

  const tab = searchParams.tab === 'company' ? 'company' : 'system'
  const from = searchParams.from ?? ''
  const to = searchParams.to ? `${searchParams.to}T23:59:59Z` : ''

  const [systemLogs, companyLogs] = await Promise.all([
    tab === 'system' ? getSystemLogs(200, from || undefined, to || undefined) : Promise.resolve([]),
    tab === 'company' ? getCompanyActivityLogs(200, from || undefined, to || undefined) : Promise.resolve([]),
  ])

  const logs = tab === 'system' ? systemLogs : companyLogs

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rendszer logok</h1>
        <p className="text-slate-500 mt-1">
          {logs.length} bejegyzés
          {from && ` · ${searchParams.from}`}
          {to && ` – ${searchParams.to}`}
        </p>
      </div>

      {/* Tabok */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <Link
          href={`/admin/logs?tab=system${from ? `&from=${searchParams.from}` : ''}${searchParams.to ? `&to=${searchParams.to}` : ''}`}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'system'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Rendszer logok
        </Link>
        <Link
          href={`/admin/logs?tab=company${from ? `&from=${searchParams.from}` : ''}${searchParams.to ? `&to=${searchParams.to}` : ''}`}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'company'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Cég tevékenység
        </Link>
      </div>

      {/* Dátumszűrő */}
      <LogsDateFilter tab={tab} from={searchParams.from ?? ''} to={searchParams.to ?? ''} />

      {/* Tartalom */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Activity className="h-8 w-8 opacity-40" />
            <p>Nincs találat a megadott időszakban.</p>
          </div>
        ) : tab === 'system' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-6 py-3">Esemény</th>
                  <th className="px-4 py-3">Cél</th>
                  <th className="px-4 py-3">Szereplő</th>
                  <th className="px-4 py-3">Dátum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(systemLogs as any[]).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-700'
                      }`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.target_name ?? '–'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.actor_email ?? '–'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('hu-HU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-6 py-3">Esemény</th>
                  <th className="px-4 py-3">Cég</th>
                  <th className="px-4 py-3">Felhasználó</th>
                  <th className="px-4 py-3">Dátum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyLogs.map((log) => (
                  <tr key={`${log.source}-${log.id}`} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {log.source === 'ai' && (
                          <Bot className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        )}
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-700'
                        }`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/companies/${log.companyId}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        {log.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.userName ?? '–'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('hu-HU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
