import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPendingSwapApprovals } from '@/app/actions/schedule'
import { SwapRequestManager } from '@/components/schedule/SwapRequestManager'
import { ArrowLeftRight } from 'lucide-react'

export default async function SwapRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const swapRequests = await getPendingSwapApprovals()

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#d4a017]/10 flex items-center justify-center">
          <ArrowLeftRight className="h-5 w-5 text-[#d4a017]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Csereigények</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {swapRequests.length > 0
              ? `${swapRequests.length} jóváhagyásra vár`
              : 'Nincs függőben lévő csere'}
          </p>
        </div>
      </div>

      <SwapRequestManager swapRequests={swapRequests as any} />
    </div>
  )
}
