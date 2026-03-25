import { getActivityLog } from '@/app/actions/audit'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const logs = await getActivityLog(50)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-[#1a5c3a]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Aktivitás napló</h1>
            <p className="text-sm text-gray-500">Az utolsó 50 változtatás a cégednél</p>
          </div>
        </div>
      </div>

      <ActivityLog logs={logs} />
    </div>
  )
}
