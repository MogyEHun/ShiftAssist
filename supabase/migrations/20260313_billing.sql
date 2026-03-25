-- Migration: Seat-based billing columns
-- Futtatás: Supabase SQL Editor

-- Új oszlopok a companies táblára
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS seat_count INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS billing_cycle_start DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS next_billing_seat_count INT,
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Oszlop a users táblára (GDPR törlési kérelem)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- subscription_plan constraint frissítés (basic/premium/trialing/cancelled)
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_plan_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_plan_check
  CHECK (subscription_plan IN ('basic', 'premium', 'trialing', 'cancelled', 'starter', 'pro', 'enterprise'));

-- subscription_status constraint frissítés
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_subscription_status_check;
ALTER TABLE companies ADD CONSTRAINT companies_subscription_status_check
  CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'cancelled'));

-- billing_history tábla (opcionális részletes napló)
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  seat_count INT NOT NULL,
  plan TEXT NOT NULL,
  amount_huf INT NOT NULL,
  stripe_invoice_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS billing_history-n
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_history_company_select" ON billing_history
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "billing_history_service_role_all" ON billing_history
  FOR ALL USING (auth.role() = 'service_role');

-- Index
CREATE INDEX IF NOT EXISTS idx_billing_history_company ON billing_history(company_id, period_start DESC);
