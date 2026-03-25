import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Nincs jogosultságod' }, { status: 403 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', profile.company_id)
    .single()

  if (!company?.stripe_customer_id) {
    return NextResponse.json({ error: 'Nincs aktív előfizetés' }, { status: 400 })
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  return NextResponse.json({ url: session.url })
}
