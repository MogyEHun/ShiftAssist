import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUserEncrypted } from '@/lib/data/users'

// Meghívó elfogadása: auth user létrehozás + users rekord
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { fullName, password } = await request.json()
  const adminClient = createAdminClient()

  // Meghívó lekérése
  const { data: invitation, error: inviteError } = await adminClient
    .from('invitations')
    .select('*, companies(id, name), positions(id, name)')
    .eq('token', params.token)
    .single()

  if (inviteError || !invitation) {
    return NextResponse.json({ error: 'Érvénytelen meghívó.' }, { status: 404 })
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'Ez a meghívó már felhasználták.' }, { status: 409 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Ez a meghívó lejárt.' }, { status: 410 })
  }

  const companyId = (invitation.companies as unknown as { id: string } | null)?.id
  const positionName = (invitation.positions as unknown as { name: string } | null)?.name ?? null

  if (!companyId) {
    return NextResponse.json({ error: 'A cég nem található.' }, { status: 404 })
  }

  // Seat limit ellenőrzés (meghívó kiküldése és beváltása között változhat)
  const { data: companyData } = await adminClient
    .from('companies')
    .select('seat_count, max_employees, subscription_status')
    .eq('id', companyId)
    .single()

  if (companyData && companyData.subscription_status !== 'trialing') {
    const { count: activeCount } = await adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true)

    const seatLimit = companyData.seat_count ?? companyData.max_employees ?? 5
    if (activeCount !== null && activeCount >= seatLimit) {
      return NextResponse.json({ error: 'A cég elérte a dolgozói limitet.' }, { status: 409 })
    }
  }

  // Auth user létrehozása
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true, // Meghívóval regisztrált → email automatikusan megerősítve
    user_metadata: { full_name: fullName },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'Ez az email cím már regisztrálva van.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Hiba a regisztráció során: ' + authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // User rekord létrehozása (titkosítva)
  try {
    await createUserEncrypted({
      id: userId,
      companyId,
      fullName,
      email: invitation.email,
      role: invitation.role,
      position: positionName,
      hourlyRate: invitation.hourly_rate,
    })
  } catch {
    // Visszagörgetés: auth user törlése
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Hiba a profil létrehozásakor.' }, { status: 500 })
  }

  // Meghívó megjelölése elfogadottként
  await adminClient
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', params.token)

  return NextResponse.json({ success: true })
}
