import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from './BillingClient'
import { calculateSeatPrice, getTrialDaysRemaining, getNextBillingDate, formatHUF } from '@/lib/billing'
import type { BillingPlan } from '@/lib/billing'

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, companies(name, subscription_plan, subscription_status, trial_ends_at, billing_cycle_start, seat_count, max_employees, stripe_customer_id)')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const company = profile.companies as unknown as {
    name: string
    subscription_plan: string
    subscription_status: string
    trial_ends_at: string | null
    billing_cycle_start: string | null
    seat_count: number | null
    max_employees: number | null
    stripe_customer_id: string | null
  } | null

  // Aktív dolgozók száma
  const { count: activeEmployees } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .eq('is_active', true)

  const plan = (company?.subscription_plan === 'premium' ? 'premium' : 'basic') as BillingPlan
  const employeeCount = activeEmployees ?? 0
  const monthlyAmount = calculateSeatPrice(plan, employeeCount)
  const trialDaysLeft = getTrialDaysRemaining(company?.trial_ends_at)
  const nextBillingDate = company?.billing_cycle_start
    ? getNextBillingDate(company.billing_cycle_start)
    : null

  return (
    <BillingClient
      currentPlan={plan}
      employeeCount={employeeCount}
      subscriptionStatus={company?.subscription_status ?? 'trialing'}
      trialDaysLeft={trialDaysLeft}
      monthlyAmount={monthlyAmount}
      formattedAmount={formatHUF(monthlyAmount)}
      nextBillingDate={nextBillingDate?.toLocaleDateString('hu-HU') ?? null}
      hasStripeCustomer={!!company?.stripe_customer_id}
    />
  )
}
