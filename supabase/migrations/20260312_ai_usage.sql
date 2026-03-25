-- ============================================================
-- ShiftSync – AI rate limiting tábla
-- Futtatás: Supabase SQL Editor > Paste > Run
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gyors index az óránkénti lekérdezéshez
CREATE INDEX IF NOT EXISTS ai_usage_user_hour_idx
  ON ai_usage (user_id, created_at);

-- RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saját ai_usage olvasás"
  ON ai_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "saját ai_usage írás"
  ON ai_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());
