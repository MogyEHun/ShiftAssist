import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Meghívó adatainak lekérése token alapján
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('invitations')
      .select('email, role, accepted_at, expires_at, company_id, position_id')
      .eq('token', params.token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Érvénytelen vagy lejárt meghívó. (DB: ' + (error?.message ?? 'not found') + ')' }, { status: 404 })
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Ez a meghívó lejárt (7 napos érvényességi idő).' }, { status: 410 })
    }

    // Cég neve külön lekérés (FK join helyett)
    let companyName = ''
    if (data.company_id) {
      const { data: company } = await adminClient
        .from('companies')
        .select('name')
        .eq('id', data.company_id)
        .single()
      companyName = company?.name ?? ''
    }

    return NextResponse.json({
      email: data.email,
      role: data.role,
      accepted_at: data.accepted_at,
      expires_at: data.expires_at,
      company_name: companyName,
      position_name: null,
    })
  } catch (err) {
    console.error('[invite GET]', err)
    return NextResponse.json({ error: 'Szerverhiba: ' + String(err) }, { status: 500 })
  }
}
