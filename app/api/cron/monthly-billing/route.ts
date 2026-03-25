import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { calculateSeatPrice, formatHUF } from '@/lib/billing'
import type { BillingPlan } from '@/lib/billing'

export async function GET(request: NextRequest) {
  // Vercel Cron hitelesítés
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const results: { company: string; amount: number; seats: number; invoiceId?: string; error?: string }[] = []

  // Aktív előfizető cégek lekérése
  const { data: companies } = await admin
    .from('companies')
    .select('id, name, subscription_plan, subscription_status, stripe_customer_id, billing_cycle_start, seat_count, max_employees')
    .in('subscription_status', ['active'])
    .not('stripe_customer_id', 'is', null)

  for (const company of companies ?? []) {
    try {
      const plan = (company.subscription_plan === 'premium' ? 'premium' : 'basic') as BillingPlan

      // Aktív dolgozók száma
      const { count: activeEmployees } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('is_active', true)

      const seatCount = activeEmployees ?? company.seat_count ?? company.max_employees ?? 5
      const amountHUF = calculateSeatPrice(plan, seatCount)

      // Stripe manual invoice létrehozása
      const invoice = await getStripe().invoices.create({
        customer: company.stripe_customer_id!,
        auto_advance: true,
        collection_method: 'charge_automatically',
        description: `ShiftAssist ${plan === 'premium' ? 'Prémium' : 'Alap'} csomag – ${seatCount} fő – ${now.getFullYear()}. ${now.getMonth() + 1}. hónap`,
        metadata: {
          company_id: company.id,
          plan,
          seat_count: String(seatCount),
        },
      })

      // Invoice item hozzáadása
      await getStripe().invoiceItems.create({
        customer: company.stripe_customer_id!,
        invoice: invoice.id,
        amount: amountHUF * 100, // Stripe fillérben vár (de HUF esetén egész)
        currency: 'huf',
        description: `${formatHUF(amountHUF)} – ${seatCount} aktív dolgozó`,
      })

      // Invoice véglegesítése
      await getStripe().invoices.finalizeInvoice(invoice.id)

      // Billing history mentése
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      await admin.from('billing_history').insert({
        company_id: company.id,
        period_start: now.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        seat_count: seatCount,
        plan,
        amount_huf: amountHUF,
        stripe_invoice_id: invoice.id,
        status: 'pending',
      })

      // billing_cycle_start frissítése
      await admin
        .from('companies')
        .update({ billing_cycle_start: now.toISOString().split('T')[0] })
        .eq('id', company.id)

      results.push({ company: company.name, amount: amountHUF, seats: seatCount, invoiceId: invoice.id })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ company: company.name, amount: 0, seats: 0, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    processed: results.length,
    results,
  })
}
