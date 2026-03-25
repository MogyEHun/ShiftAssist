import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeeShell } from '@/components/layout/EmployeeShell'
import { decrypt } from '@/lib/encryption'

const NOTIFICATION_ACTIONS = ['shift_assigned', 'shift_updated', 'shift_published', 'shift_cancelled', 'leave_approved', 'leave_rejected', 'swap_approved', 'swap_rejected']

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: userData } = await supabase
      .from('users')
      .select('role, full_name_encrypted, companies(name)')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'employee') {
      redirect('/dashboard')
    }

    // Olvasatlan értesítések száma (utolsó 7 nap) – hiba esetén 0
    let unreadCount = 0
    try {
      const { count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('action', NOTIFICATION_ACTIONS)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      unreadCount = count ?? 0
    } catch { /* ha az audit_log nem elérhető, folytatjuk 0-val */ }

    const fullName = userData?.full_name_encrypted ? decrypt(userData.full_name_encrypted) : 'Dolgozó'
    const companyName = (userData?.companies as { name?: string } | null)?.name ?? 'ShiftAssist'

    return (
      <EmployeeShell fullName={fullName} companyName={companyName} unreadCount={unreadCount}>
        {children}
      </EmployeeShell>
    )
  } catch (err: unknown) {
    // Next.js redirect() dob egy speciális error-t – azt továbbadjuk
    const isRedirect = err instanceof Error && ('digest' in err) && String((err as any).digest).startsWith('NEXT_REDIRECT')
    if (isRedirect) throw err
    // Egyéb hibák: logoljuk és rethrow – a hibaüzenet megjelenik a konzolon
    console.error('[MyLayout] Kritikus hiba a dolgozói layoutban:', err)
    throw err
  }
}
