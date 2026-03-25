// Seat-based billing logic (4.2)
// Sávos árazás: Alap és Prémium csomag, minimum havidíjjal

export type BillingPlan = 'basic' | 'premium'

interface PricingTier {
  max: number     // Maximum dolgozók száma ebben a sávban (Infinity = korlátlan)
  price: number   // Ft/fő/hó ebben a sávban
}

interface PlanConfig {
  tiers: PricingTier[]
  min: number     // Minimum havidíj Ft-ban
}

export const SEAT_PRICING: Record<BillingPlan, PlanConfig> = {
  basic: {
    tiers: [
      { max: 10,       price: 1060 },
      { max: 25,       price: 890  },
      { max: 60,       price: 720  },
      { max: 100,      price: 595  },
      { max: Infinity, price: 510  },
    ],
    min: 20000,
  },
  premium: {
    tiers: [
      { max: 10,       price: 1700 },
      { max: 25,       price: 1425 },
      { max: 60,       price: 1150 },
      { max: 100,      price: 950  },
      { max: Infinity, price: 815  },
    ],
    min: 30000,
  },
}

/**
 * Kiszámolja a havi díjat a csomag és a seat szám alapján.
 * Ha az eredmény kisebb mint a minimum, a minimum díjat alkalmazza.
 */
export function calculateSeatPrice(plan: BillingPlan, seatCount: number): number {
  const config = SEAT_PRICING[plan]
  const tier = config.tiers.find((t) => seatCount <= t.max) ?? config.tiers.at(-1)!
  const calculated = seatCount * tier.price
  return Math.max(calculated, config.min)
}

/**
 * Visszaadja az aktuális sávot (debug / megjelenítési célra).
 */
export function getPriceTier(plan: BillingPlan, seatCount: number): PricingTier {
  const config = SEAT_PRICING[plan]
  return config.tiers.find((t) => seatCount <= t.max) ?? config.tiers.at(-1)!
}

/**
 * Hány nap van hátra a trial-ból (0 ha lejárt).
 */
export function getTrialDaysRemaining(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Mehet-e új dolgozó meghívása a jelenlegi seat_count alapján?
 * A companies.seat_count az aktív dolgozók maximuma.
 */
export function canAddEmployee(company: {
  seat_count?: number | null
  max_employees?: number | null
  subscription_status?: string | null
}): boolean {
  // Trialing időszakban szabad (max_employees alapján)
  if (company.subscription_status === 'trialing') return true
  // Cancelled/past_due esetén nem lehet bővíteni
  if (company.subscription_status === 'cancelled' || company.subscription_status === 'canceled') return false
  // seat_count nincs beállítva → max_employees fallback
  const limit = company.seat_count ?? company.max_employees ?? 5
  return limit > 0  // A tényleges ellenőrzés az inviteStaff-ban DB query alapján történik
}

/**
 * Következő számlázási dátum kiszámítása (billing_cycle_start + 1 hónap).
 */
export function getNextBillingDate(billingCycleStart: string | Date): Date {
  const start = new Date(billingCycleStart)
  return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
}

/**
 * Havi díj formázása magyar forintban.
 */
export function formatHUF(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount)
}
