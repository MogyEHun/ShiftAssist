import { getLeaveRequests } from '@/app/actions/leave'
import { LeaveClient } from '@/components/leave/LeaveClient'
import { getLocale, getT } from '@/lib/i18n'

export default async function MyLeavePage() {
  const t = getT(getLocale())
  const requests = await getLeaveRequests()
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">{t('leave.myRequests')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('leave.submitAndTrack')}</p>
      </div>
      <LeaveClient requests={requests} isManager={false} pendingCount={0} />
    </div>
  )
}
