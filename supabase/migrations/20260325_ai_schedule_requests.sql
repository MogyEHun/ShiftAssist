-- ============================================================
-- AI beosztás kérés rate-limiting tábla
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_schedule_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_schedule_requests_company_day_idx
  ON ai_schedule_requests (company_id, created_at);

ALTER TABLE ai_schedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON ai_schedule_requests
  USING (false);
