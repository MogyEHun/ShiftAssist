import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Nincs jogosultságod' }, { status: 403 })
  }

  const { shiftId, category, entry } = await req.json()
  if (!shiftId || !entry) {
    return NextResponse.json({ error: 'Hiányzó adatok' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('shifts')
    .update({
      logbook_entry: entry,
      logbook_category: category ?? 'normal',
      updated_at: new Date().toISOString(),
    })
    .eq('id', shiftId)
    .eq('company_id', profile.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
