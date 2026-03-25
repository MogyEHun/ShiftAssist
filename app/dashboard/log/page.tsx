import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActivityLog } from '@/app/actions/audit'
import { getClockEntries } from '@/app/actions/attendance'
import { getCompanyUsers } from '@/lib/data/users'
import { LogPageClient } from './LogPageClient'
import { ScrollText } from 'lucide-react'
import { getLocale, getT } from '@/lib/i18n'
import { format } from 'date-fns'

export default async function LogPage() {
  const t = getT(getLocale())
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  const [logs, initialEntries, employees] = await Promise.all([
    getActivityLog(200),
    getClockEntries({ date: today }),
    getCompanyUsers(profile.company_id, true),
  ])

  const employeeNames: Record<string, string> = {}
  for (const emp of employees) {
    employeeNames[emp.id] = emp.full_name
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center">
          <ScrollText className="h-4 w-4 text-[#1a5c3a]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('log.title')}</h1>
          <p className="text-sm text-gray-500">{t('log.subtitle')}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col">
        <LogPageClient
          logs={logs}
          initialEntries={initialEntries}
          initialDate={today}
          employeeNames={employeeNames}
        />
      </div>
    </div>
  )
}
