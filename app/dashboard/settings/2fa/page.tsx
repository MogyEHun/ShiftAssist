import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { get2FAStatus } from '@/app/actions/two-factor'
import { TwoFactorClient } from './TwoFactorClient'

export default async function TwoFactorSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { enabled } = await get2FAStatus()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Kétlépéses azonosítás</h1>
        <p className="text-sm text-gray-500 mt-1">
          TOTP alapú kétfaktoros hitelesítés beállítása a fiókodhoz.
        </p>
      </div>
      <TwoFactorClient initialEnabled={enabled} />
    </div>
  )
}
