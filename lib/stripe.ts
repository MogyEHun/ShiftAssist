import Stripe from 'stripe'

// Lazy inicializálás – csak runtime-ban jön létre, build-time nem dob hibát
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return _stripe
}

// ============================================================
// Sávos árazás (fő/hó alapú, minimum havidíjjal)
// ============================================================

export type PricingPlan = 'basic' | 'premium'

interface PricingTier {
  maxEmployees: number
  pricePerEmployee: number // Ft/fő/hó
}

export const PRICING_TIERS: Record<PricingPlan, { tiers: PricingTier[]; minMonthly: number; name: string }> = {
  basic: {
    name: 'Alap csomag',
    minMonthly: 20000,
    tiers: [
      { maxEmployees: 10,  pricePerEmployee: 1060 },
      { maxEmployees: 25,  pricePerEmployee: 890  },
      { maxEmployees: 60,  pricePerEmployee: 720  },
      { maxEmployees: 100, pricePerEmployee: 595  },
      { maxEmployees: Infinity, pricePerEmployee: 510 },
    ],
  },
  premium: {
    name: 'Prémium csomag',
    minMonthly: 30000,
    tiers: [
      { maxEmployees: 10,  pricePerEmployee: 1700 },
      { maxEmployees: 25,  pricePerEmployee: 1420 },
      { maxEmployees: 60,  pricePerEmployee: 1150 },
      { maxEmployees: 100, pricePerEmployee: 950  },
      { maxEmployees: Infinity, pricePerEmployee: 815 },
    ],
  },
}

/**
 * Havi díj kiszámítása az aktív dolgozók száma alapján.
 * Sávos: minden sávban az adott sávra jellemző egységár van.
 * @returns összeg Ft-ban
 */
export function calculateMonthlyPrice(plan: PricingPlan, employeeCount: number): number {
  const { tiers, minMonthly } = PRICING_TIERS[plan]
  const tier = tiers.find(t => employeeCount <= t.maxEmployees) ?? tiers[tiers.length - 1]
  const calculated = employeeCount * tier.pricePerEmployee
  return Math.max(calculated, minMonthly)
}

/**
 * Melyik sávban van az adott létszám?
 */
export function getPriceTier(plan: PricingPlan, employeeCount: number): PricingTier {
  const { tiers } = PRICING_TIERS[plan]
  return tiers.find(t => employeeCount <= t.maxEmployees) ?? tiers[tiers.length - 1]
}

// Stripe Price ID-k (Vercelen kell beállítani)
export const STRIPE_PRICE_IDS: Record<PricingPlan, string> = {
  basic:   process.env.STRIPE_PRICE_BASIC ?? '',
  premium: process.env.STRIPE_PRICE_PREMIUM ?? '',
}
