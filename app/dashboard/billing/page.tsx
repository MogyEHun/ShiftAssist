import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from './BillingClient'
import { calculateSeatPrice, getTrialDaysRemaining, getNextBillingDate, formatHUF } from '@/lib/billing'
import type { BillingPlan } from '@/lib/billing'
import { AlertTriangle } from 'lucide-react'

const BLOCK_MESSAGES: Record<string, { title: string; body: string }> = {
  trial_expired: {
    title: 'A 14 napos próbaidőszak lejárt',
    body: 'A fiókod próbaidőszaka véget ért. Az összes funkció eléréséhez aktiválj előfizetést.',
  },
  canceled: {
    title: 'Az előfizetés megszűnt',
    body: 'Az előfizetésed törölve lett. A hozzáférés visszaállításához aktiválj új előfizetést.',
  },
}

interface Props {
  searchParams: { reason?: string }
}

export default async function BillingPage({ searchParams }: Props) {
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

  const blockMessage = searchParams.reason ? BLOCK_MESSAGES[searchParams.reason] : null

  return (
    <>
      {blockMessage && (
        <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{blockMessage.title}</p>
            <p className="text-sm text-red-700 mt-0.5">{blockMessage.body}</p>
          </div>
        </div>
      )}
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
    </>
  )
}
