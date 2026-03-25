import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/app/actions/tasks'
import { getTaskTemplates } from '@/app/actions/task-templates'
import { getCompanyUsers, getUserById } from '@/lib/data/users'
import { TaskDashboardClient } from '@/components/tasks/TaskDashboardClient'
import { getLocale, getT } from '@/lib/i18n'

export default async function TasksPage() {
  const t = getT(getLocale())
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getUserById(user.id)
  if (!profile) redirect('/login')

  const isManager = ['owner', 'admin', 'manager'].includes(profile.role)
  if (!isManager) redirect('/my/tasks')

  const [tasks, employees, templates] = await Promise.all([
    getTasks(),
    getCompanyUsers(profile.company_id, true),
    getTaskTemplates(),
  ])

  const pendingCount = tasks.filter(t => t.status === 'pending').length

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-[#1a5c3a]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pendingCount > 0
              ? `${pendingCount} ${t('tasks.pendingCount')}`
              : t('tasks.noPending')}
          </p>
        </div>
      </div>

      <TaskDashboardClient
        initialTasks={tasks}
        employees={employees.map(e => ({
          id: e.id,
          full_name: e.full_name,
          position: e.position,
        }))}
        initialTemplates={templates}
      />
    </div>
  )
}
