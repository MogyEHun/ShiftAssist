import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/app/actions/tasks'
import { getTodayTemplates } from '@/app/actions/task-templates'
import { MyTasksClient } from './MyTasksClient'
import { getLocale, getT } from '@/lib/i18n'

export default async function MyTasksPage() {
  const t = getT(getLocale())
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tasks, templateTasks] = await Promise.all([
    getTasks(),
    getTodayTemplates(),
  ])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t('myTasks.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('myTasks.subtitle')}</p>
      </div>
      <MyTasksClient initialTasks={tasks} templateTasks={templateTasks} userId={user.id} />
    </div>
  )
}
