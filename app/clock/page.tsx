import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyClockStatus } from '@/app/actions/attendance'
import { ClockWidget } from './ClockWidget'
import { CalendarDays } from 'lucide-react'

interface Props {
  searchParams: { token?: string }
}

export default async function ClockPage({ searchParams }: Props) {
  const token = searchParams.token ?? ''

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 text-sm">Érvénytelen QR-kód.</p>
      </div>
    )
  }

  // Auth ellenőrzés
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/clock?token=${encodeURIComponent(token)}`)
  }

  // Saját név lekérése
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Clock státusz
  const status = await getMyClockStatus(token)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1a5c3a] text-white px-6 py-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 opacity-80" />
        <span className="font-semibold text-base">SyncShift</span>
        {status.companyName && (
          <span className="text-white/60 text-sm ml-1">· {status.companyName}</span>
        )}
        {status.siteName && (
          <span className="text-white/60 text-sm ml-1">· {status.siteName}</span>
        )}
      </div>

      {/* Widget */}
      <div className="flex-1 flex items-center justify-center p-6">
        <ClockWidget
          token={token}
          isClockedIn={status.isClockedIn}
          clockInAt={status.clockInAt}
          userName={profile?.full_name ?? ''}
          error={status.error}
        />
      </div>
    </div>
  )
}
