import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICE_IDS, PricingPlan } from '@/lib/stripe'

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
    return NextResponse.json({ error: 'Csak tulajdonos módosíthatja az előfizetést' }, { status: 403 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, stripe_customer_id')
    .eq('id', profile.company_id)
    .single()

  if (!company) return NextResponse.json({ error: 'Cég nem található' }, { status: 404 })

  const { plan } = await req.json() as { plan: PricingPlan }
  const priceId = STRIPE_PRICE_IDS[plan]
  if (!priceId) return NextResponse.json({ error: 'Érvénytelen csomag' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  // Customer létrehozása vagy meglévő használata
  let customerId = company.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: company.name,
      metadata: { company_id: company.id },
    })
    customerId = customer.id

    await supabase
      .from('companies')
      .update({ stripe_customer_id: customerId })
      .eq('id', company.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    metadata: { company_id: company.id, plan },
    subscription_data: {
      metadata: { company_id: company.id, plan },
    },
  })

  return NextResponse.json({ url: session.url })
}
