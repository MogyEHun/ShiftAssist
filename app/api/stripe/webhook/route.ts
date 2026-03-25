import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const companyId = session.metadata?.company_id
      const plan = session.metadata?.plan as 'basic' | 'premium' | undefined
      if (!companyId || !plan) break

      await admin.from('companies').update({
        subscription_plan: plan,
        subscription_status: 'active',
        stripe_subscription_id: session.subscription as string,
      }).eq('id', companyId)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const companyId = sub.metadata?.company_id
      if (!companyId) break

      const status = sub.status === 'active' ? 'active'
        : sub.status === 'past_due' ? 'past_due'
        : sub.status === 'canceled' ? 'canceled'
        : 'trialing'

      await admin.from('companies').update({
        subscription_status: status,
      }).eq('id', companyId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const companyId = sub.metadata?.company_id
      if (!companyId) break

      await admin.from('companies').update({
        subscription_status: 'canceled',
        stripe_subscription_id: null,
      }).eq('id', companyId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
