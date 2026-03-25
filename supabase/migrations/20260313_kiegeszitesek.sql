-- ============================================================
-- ShiftSync – Kiegészítő táblák és indexek
-- 2026-03-13
-- ============================================================

-- ------------------------------------------------------------
-- 1. AVAILABILITY – Dolgozói elérhetőség
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week      SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Hétfő, 6=Vasárnap
  from_time        TIME,          -- null = egész nap
  to_time          TIME,          -- null = egész nap
  max_days_per_week SMALLINT,     -- max hány napot vállal ezen a héten
  valid_from       DATE,
  valid_until      DATE,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, user_id, day_of_week)
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability cégen belüli olvasás"
  ON availability FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "availability saját írás"
  ON availability FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_id = auth.uid());

CREATE POLICY "availability saját frissítés"
  ON availability FOR UPDATE
  USING (company_id = get_user_company_id() AND user_id = auth.uid());

CREATE POLICY "availability saját törlés"
  ON availability FOR DELETE
  USING (company_id = get_user_company_id() AND user_id = auth.uid());

-- Manager/owner bármely dolgozó availability-jét írhatja
CREATE POLICY "availability manager írás"
  ON availability FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "availability manager frissítés"
  ON availability FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

-- ------------------------------------------------------------
-- 2. CHAT_HISTORY – AI chatbot előzmények
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, created_at DESC);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat history saját olvasás"
  ON chat_history FOR SELECT
  USING (user_id = auth.uid() AND company_id = get_user_company_id());

CREATE POLICY "chat history saját írás"
  ON chat_history FOR INSERT
  WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id());

-- ------------------------------------------------------------
-- 3. AUDIT_LOG – Cég szintű változtatási napló
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,       -- pl. 'shift.create', 'leave.approve', 'staff.deactivate'
  entity_type TEXT NOT NULL,       -- pl. 'shift', 'leave_request', 'user'
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_company
  ON audit_log(company_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit log manager olvasás"
  ON audit_log FOR SELECT
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

-- INSERT csak service role (server action) végzi, nincs user-oldali policy

-- ------------------------------------------------------------
-- 4. SHIFT_TEMPLATES – Ismétlődő műszak sablonok
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6), -- null = bármely nap
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  position    TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift templates cégen belüli olvasás"
  ON shift_templates FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "shift templates manager írás"
  ON shift_templates FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "shift templates manager frissítés"
  ON shift_templates FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "shift templates manager törlés"
  ON shift_templates FOR DELETE
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin', 'manager')
  );

-- ------------------------------------------------------------
-- 5. OVERTIME_CONFIG – Cégszintű munkaóra beállítás
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS overtime_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  weekly_hour_warning  SMALLINT NOT NULL DEFAULT 40,
  weekly_hour_max      SMALLINT NOT NULL DEFAULT 48,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE overtime_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overtime config olvasás"
  ON overtime_config FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "overtime config owner írás"
  ON overtime_config FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "overtime config owner frissítés"
  ON overtime_config FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- ------------------------------------------------------------
-- 6. SHIFTS TÁBLA KIEGÉSZÍTÉS – Logbook mezők
-- ------------------------------------------------------------
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS logbook_entry TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS logbook_category TEXT
  CHECK (logbook_category IN ('normal', 'problem', 'important'));

-- ------------------------------------------------------------
-- 7. TELJESÍTMÉNY INDEXEK
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_shifts_company_date
  ON shifts(company_id, date(start_time));

CREATE INDEX IF NOT EXISTS idx_shifts_user_id
  ON shifts(user_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_company_status
  ON leave_requests(company_id, status);

CREATE INDEX IF NOT EXISTS idx_availability_user
  ON availability(user_id, day_of_week);

-- idx_audit_log_company már létrehozva fentebb
