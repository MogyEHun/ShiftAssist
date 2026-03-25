import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateUserEncrypted } from '@/lib/data/users'
import { sanitizeName } from '@/lib/sanitize'

/**
 * POST /api/profile/update
 * Profil frissítés titkosítással (szerver oldalon)
 * Body: FormData { fullName, phone, email? }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nincs bejelentkezve' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Profil nem található' }, { status: 404 })
  }

  const formData = await request.formData()
  const fullName = sanitizeName(formData.get('fullName') as string) as string
  const phone = (formData.get('phone') as string)?.trim() || null
  const newEmail = (formData.get('email') as string)?.trim().toLowerCase() || null
  const birthDateRaw = (formData.get('birthDate') as string)?.trim() || null
  const birthDate = birthDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw) ? birthDateRaw : null

  if (!fullName) {
    return NextResponse.json({ error: 'A név megadása kötelező' }, { status: 400 })
  }

  const { error } = await updateUserEncrypted(user.id, profile.company_id, { fullName, phone })
  if (!error && birthDate !== undefined) {
    await supabase.from('users').update({ birth_date: birthDate }).eq('id', user.id)
  }
  if (error) return NextResponse.json({ error }, { status: 500 })

  // Email módosítás – Supabase megerősítő emailt küld az új címre
  if (newEmail && newEmail !== user.email) {
    const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail })
    if (emailErr) return NextResponse.json({ error: emailErr.message }, { status: 500 })
    return NextResponse.json({ success: true, emailPending: true })
  }

  return NextResponse.json({ success: true })
}
