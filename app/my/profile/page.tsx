import { createClient } from '@/lib/supabase/server'
import { MyProfileClient } from './MyProfileClient'
import { getUserById } from '@/lib/data/users'

export default async function MyProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await getUserById(user.id)

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Profilom</h1>
        <p className="text-sm text-gray-500 mt-0.5">Személyes adatok és beállítások</p>
      </div>
      <MyProfileClient profile={{
          id: profile?.id ?? user.id,
          full_name: profile?.full_name ?? '',
          email: profile?.email ?? user.email ?? '',
          phone: profile?.phone ?? null,
          position: profile?.position ?? null,
          avatar_url: profile?.avatar_url ?? null,
          birth_date: profile?.birth_date ?? null,
        }} />
    </div>
  )
}
