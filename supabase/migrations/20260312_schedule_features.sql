-- =============================================================
-- ShiftSync – Beosztás rendszer migration
-- Futtatás: Supabase SQL Editor > Paste > Run
-- =============================================================

-- 1. shifts.status CHECK bővítése 'swappable' értékkel
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_status_check
  CHECK (status IN ('draft', 'published', 'cancelled', 'swappable'));

-- 2. Gyors heti lekérdezési indexek
CREATE INDEX IF NOT EXISTS shifts_time_range_idx
  ON shifts (company_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS shifts_user_week_idx
  ON shifts (user_id, start_time);

-- 3. shift_swap_requests tábla RLS policy frissítés
--    (tábla már létezik a schema.sql-ben, csak policy-kat finomítjuk)

-- Töröljük a régi policy-kat ha léteznek
DROP POLICY IF EXISTS "Users can view own company swap requests" ON shift_swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON shift_swap_requests;
DROP POLICY IF EXISTS "Managers can update swap requests" ON shift_swap_requests;
DROP POLICY IF EXISTS "Users can update own swap requests" ON shift_swap_requests;

-- Olvasás: saját céghez tartozó összes csere-kérés
CREATE POLICY "company members can view swap requests"
  ON shift_swap_requests FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Létrehozás: csak saját műszakra lehet cserét kérni
CREATE POLICY "employees can create swap requests"
  ON shift_swap_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND shift_id IN (
      SELECT id FROM shifts WHERE user_id = auth.uid()
    )
  );

-- Frissítés: manager/owner/admin jóváhagyhat, vagy a target user elvállalhatja
CREATE POLICY "managers and target can update swap requests"
  ON shift_swap_requests FOR UPDATE
  USING (
    -- Manager/owner/admin jóváhagyhat
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    )
    -- A célszemély elvállalhatja a cserét
    OR target_user_id = auth.uid()
    -- Kérelmező visszavonhatja
    OR requester_id = auth.uid()
  );

-- =============================================================
-- MEGJEGYZÉS: Futtasd le ezt a fájlt a Supabase SQL Editorban!
-- Ezután indítsd újra a Next.js dev szervert.
-- =============================================================
