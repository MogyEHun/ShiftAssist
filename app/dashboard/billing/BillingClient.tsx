'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink, Clock, Users, CheckCircle } from 'lucide-react'
import { PricingTable } from '@/components/billing/PricingTable'
import type { PricingPlan } from '@/lib/stripe'

interface Props {
  currentPlan: PricingPlan
  employeeCount: number
  subscriptionStatus: string
  trialDaysLeft: number
  monthlyAmount: number
  formattedAmount: string
  nextBillingDate: string | null
  hasStripeCustomer: boolean
}

export function BillingClient({
  currentPlan,
  employeeCount,
  subscriptionStatus,
  trialDaysLeft,
  monthlyAmount,
  formattedAmount,
  nextBillingDate,
  hasStripeCustomer,
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleSelectPlan(plan: PricingPlan) {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert('Hiba az előfizetés indításakor')
    }
    setLoading(false)
  }

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert('Hiba a számlázási portál megnyitásakor')
    }
    setLoading(false)
  }

  const isTrialing = subscriptionStatus === 'trialing'
  const isActive = subscriptionStatus === 'active'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#1a5c3a]/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-[#1a5c3a]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Előfizetés</h1>
            <p className="text-sm text-gray-500">Válaszd ki a cégednek megfelelő csomagot</p>
          </div>
        </div>

        {hasStripeCustomer && (
          <button
            onClick={handlePortal}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Számlák & kezelés
          </button>
        )}
      </div>

      {/* Jelenlegi állapot összefoglaló */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">Aktív dolgozók</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{employeeCount} fő</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">Várható havi díj</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formattedAmount}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {isTrialing ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500">Próbaidő</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{trialDaysLeft} nap</p>
            </>
          ) : isActive ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-gray-500">Következő számla</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{nextBillingDate ?? '—'}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">Állapot</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 capitalize">{subscriptionStatus}</p>
            </>
          )}
        </div>
      </div>

      <PricingTable
        currentPlan={currentPlan}
        employeeCount={employeeCount}
        onSelectPlan={handleSelectPlan}
        loading={loading}
      />

      <p className="mt-6 text-xs text-gray-400 text-center">
        A számlázás minden hónap 1-jén esedékes az aktív dolgozók száma alapján.
        Az előfizetés bármikor lemondható.{' '}
        <a href="/terms" className="underline hover:text-gray-600">ÁSZF</a>
      </p>
    </div>
  )
}
