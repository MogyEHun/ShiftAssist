'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { PRICING_TIERS, calculateMonthlyPrice, PricingPlan } from '@/lib/stripe'

const FEATURES: Record<PricingPlan, string[]> = {
  basic: [
    'Heti beosztáskezelő',
    'Csereigény rendszer',
    'Szabadságkezelés',
    'Email értesítések',
    'Push értesítések',
    'Korlátlan dolgozó',
  ],
  premium: [
    'Minden Alap funkció',
    'AI beosztástervező',
    'AI asszisztens (chat)',
    'Műszak napló (AI összefoglalóval)',
    'Szabad műszak marketplace',
    'Valós idejű szinkronizáció',
    'PDF + CSV export',
    'Prioritásos support',
  ],
}

interface Props {
  currentPlan: string
  employeeCount: number
  onSelectPlan: (plan: PricingPlan) => void
  loading: boolean
}

export function PricingTable({ currentPlan, employeeCount, onSelectPlan, loading }: Props) {
  const [previewCount, setPreviewCount] = useState(employeeCount)

  return (
    <div className="space-y-6">
      {/* Létszám kalkulátor */}
      <div className="bg-gray-50 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Aktív dolgozók száma (előnézet): <strong>{previewCount} fő</strong>
        </label>
        <input
          type="range"
          min={1}
          max={200}
          value={previewCount}
          onChange={(e) => setPreviewCount(Number(e.target.value))}
          className="w-full accent-[#1a5c3a]"
        />
      </div>

      {/* Táblázat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['basic', 'premium'] as PricingPlan[]).map((plan) => {
          const info = PRICING_TIERS[plan]
          const monthly = calculateMonthlyPrice(plan, previewCount)
          const isCurrent = currentPlan === plan
          const isPremium = plan === 'premium'

          return (
            <div
              key={plan}
              className={`rounded-2xl border-2 p-6 transition-all ${
                isPremium
                  ? 'border-[#d4a017] bg-gradient-to-b from-amber-50 to-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {isPremium && (
                <span className="inline-block px-3 py-0.5 bg-[#d4a017] text-white text-xs font-bold rounded-full mb-3">
                  Ajánlott
                </span>
              )}

              <h3 className="text-lg font-bold text-gray-900">{info.name}</h3>

              <div className="mt-3 mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  {monthly.toLocaleString('hu-HU')} Ft
                </span>
                <span className="text-sm text-gray-500">/hó</span>
                <p className="text-xs text-gray-400 mt-1">
                  {(monthly / previewCount).toFixed(0)} Ft/fő · min. {info.minMonthly.toLocaleString('hu-HU')} Ft
                </p>
              </div>

              {/* Sávok */}
              <div className="mb-4 space-y-1">
                {info.tiers.map((tier, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500">
                    <span>
                      {i === 0 ? `1–${tier.maxEmployees}` : tier.maxEmployees === Infinity ? `${info.tiers[i-1].maxEmployees + 1}+` : `${info.tiers[i-1].maxEmployees + 1}–${tier.maxEmployees}`} fő
                    </span>
                    <span>{tier.pricePerEmployee.toLocaleString('hu-HU')} Ft/fő</span>
                  </div>
                ))}
              </div>

              <ul className="space-y-2 mb-6">
                {FEATURES[plan].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-[#1a5c3a] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2.5 text-center text-sm font-medium text-[#1a5c3a] bg-[#1a5c3a]/10 rounded-xl">
                  Jelenlegi csomag
                </div>
              ) : (
                <button
                  onClick={() => onSelectPlan(plan)}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    isPremium
                      ? 'bg-[#d4a017] text-white hover:bg-[#d4a017]/90'
                      : 'bg-[#1a5c3a] text-white hover:bg-[#1a5c3a]/90'
                  }`}
                >
                  {loading ? 'Átirányítás...' : 'Csomag választása'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
