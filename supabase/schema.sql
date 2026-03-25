-- ============================================================
-- ShiftSync - Adatbázis séma
-- Supabase (PostgreSQL) - Futtasd le a Supabase SQL Editorban
-- ============================================================

-- UUID extension (általában már engedélyezett Supabase-ben)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- updated_at automatikus frissítése triggerrel
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- 1. COMPANIES (Multi-tenant cégek)
-- ============================================================
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,          -- URL-barát azonosító (pl. "bistro-pest")
  logo_url    TEXT,

  -- Előfizetés
  subscription_plan    TEXT NOT NULL DEFAULT 'starter'
                       CHECK (subscription_plan IN ('starter', 'pro', 'enterprise')),
  subscription_status  TEXT NOT NULL DEFAULT 'trialing'
                       CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  max_employees           INT NOT NULL DEFAULT 15,
  trial_ends_at           TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- Beállítások
  timezone    TEXT NOT NULL DEFAULT 'Europe/Budapest',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. USERS (Dolgozók - kiterjeszti a Supabase auth.users táblát)
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'employee'
              CHECK (role IN ('admin', 'manager', 'employee')),
  phone       TEXT,
  position    TEXT,                          -- Munkakör (pl. "Pincér", "Szakács")
  hourly_rate DECIMAL(10, 2),               -- Órabér (opcionális)
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. SHIFTS (Műszakok)
-- ============================================================
CREATE TABLE shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,  -- null = betöltetlen
  title             TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'fixed'
                    CHECK (type IN ('fixed', 'flexible')),
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'cancelled')),
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  location          TEXT,
  notes             TEXT,
  required_position TEXT,                    -- Betöltetlen műszakhoz szükséges munkakör
  break_minutes     INT NOT NULL DEFAULT 0,
  created_by        UUID NOT NULL REFERENCES users(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validáció: end_time > start_time
  CONSTRAINT shifts_time_check CHECK (end_time > start_time)
);

CREATE INDEX idx_shifts_company_id ON shifts(company_id);
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_start_time ON shifts(start_time);
CREATE INDEX idx_shifts_status ON shifts(status);

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. SHIFT_SWAP_REQUESTS (Műszak csereigények)
-- ============================================================
CREATE TABLE shift_swap_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requester_id     UUID NOT NULL REFERENCES users(id),
  target_user_id   UUID REFERENCES users(id),             -- null = bárki elveheti
  shift_id         UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  target_shift_id  UUID REFERENCES shifts(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  message          TEXT,                                  -- Üzenet a cserepartnernek
  manager_note     TEXT,                                  -- Manager megjegyzése
  reviewed_by      UUID REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_swap_requests_company_id ON shift_swap_requests(company_id);
CREATE INDEX idx_swap_requests_requester_id ON shift_swap_requests(requester_id);
CREATE INDEX idx_swap_requests_status ON shift_swap_requests(status);

CREATE TRIGGER update_swap_requests_updated_at
  BEFORE UPDATE ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. LEAVE_REQUESTS (Szabadságkérelmek)
-- ============================================================
CREATE TABLE leave_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'vacation'
               CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  reason       TEXT,
  manager_note TEXT,
  reviewed_by  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validáció: end_date >= start_date
  CONSTRAINT leave_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. TASKS (Napi feladatok)
-- ============================================================
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shift_id      UUID REFERENCES shifts(id) ON DELETE SET NULL,
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  due_date      DATE,
  created_by    UUID NOT NULL REFERENCES users(id),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_company_id ON tasks(company_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_shift_id ON tasks(shift_id);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. COMPANY_KNOWLEDGE (AI Chatbot tudásbázis)
-- ============================================================
CREATE TABLE company_knowledge (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,              -- AI által kereshető szöveg
  category    TEXT,                       -- pl. "szabályzat", "folyamat", "termék"
  created_by  UUID NOT NULL REFERENCES users(id),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_company_id ON company_knowledge(company_id);
CREATE INDEX idx_knowledge_category ON company_knowledge(category);

-- Teljes szöveges keresés az AI chatbot számára
CREATE INDEX idx_knowledge_content_fts ON company_knowledge
  USING GIN (to_tsvector('hungarian', content));

CREATE TRIGGER update_knowledge_updated_at
  BEFORE UPDATE ON company_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Minden táblán
-- ============================================================

-- RLS bekapcsolása
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_knowledge ENABLE ROW LEVEL SECURITY;

-- Helper function: visszaadja az aktuális user company_id-ját
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: visszaadja az aktuális user szerepkörét
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- COMPANIES policies
-- ------------------------------------------------------------
CREATE POLICY "Saját céget láthatja a user" ON companies
  FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "Admin módosíthatja a cégét" ON companies
  FOR UPDATE USING (
    id = get_user_company_id() AND get_user_role() = 'admin'
  );

-- ------------------------------------------------------------
-- USERS policies
-- ------------------------------------------------------------
CREATE POLICY "Cég tagjait láthatják egymás" ON users
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Saját profilt módosíthat a user" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin/manager kezelheti a dolgozókat" ON users
  FOR ALL USING (
    company_id = get_user_company_id() AND
    get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------------------
-- SHIFTS policies
-- ------------------------------------------------------------
CREATE POLICY "Saját cég műszakjait láthatja" ON shifts
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Admin/manager hozhat létre műszakot" ON shifts
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() AND
    get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Admin/manager módosíthatja a műszakot" ON shifts
  FOR UPDATE USING (
    company_id = get_user_company_id() AND
    get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Admin/manager törölheti a műszakot" ON shifts
  FOR DELETE USING (
    company_id = get_user_company_id() AND
    get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------------------
-- SHIFT_SWAP_REQUESTS policies
-- ------------------------------------------------------------
CREATE POLICY "Saját cég csereigényeit láthatja" ON shift_swap_requests
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Dolgozó kérhet cserét" ON shift_swap_requests
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() AND
    requester_id = auth.uid()
  );

CREATE POLICY "Requester visszavonhatja, manager kezelheti" ON shift_swap_requests
  FOR UPDATE USING (
    company_id = get_user_company_id() AND (
      requester_id = auth.uid() OR
      get_user_role() IN ('admin', 'manager')
    )
  );

-- ------------------------------------------------------------
-- LEAVE_REQUESTS policies
-- ------------------------------------------------------------
CREATE POLICY "Saját és cég szabadságait láthatja manager" ON leave_requests
  FOR SELECT USING (
    company_id = get_user_company_id() AND (
      user_id = auth.uid() OR
      get_user_role() IN ('admin', 'manager')
    )
  );

CREATE POLICY "Dolgozó kérhet szabadságot" ON leave_requests
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() AND
    user_id = auth.uid()
  );

CREATE POLICY "Saját kérést módosíthat, manager kezelhet" ON leave_requests
  FOR UPDATE USING (
    company_id = get_user_company_id() AND (
      user_id = auth.uid() OR
      get_user_role() IN ('admin', 'manager')
    )
  );

-- ------------------------------------------------------------
-- TASKS policies
-- ------------------------------------------------------------
CREATE POLICY "Saját cég feladatait láthatja" ON tasks
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Admin/manager hozhat létre feladatot" ON tasks
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() AND
    get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Hozzárendelt user teljesíthet, manager kezelhet" ON tasks
  FOR UPDATE USING (
    company_id = get_user_company_id() AND (
      assigned_to = auth.uid() OR
      get_user_role() IN ('admin', 'manager')
    )
  );

-- ------------------------------------------------------------
-- COMPANY_KNOWLEDGE policies
-- ------------------------------------------------------------
CREATE POLICY "Saját cég tudásbázisát láthatja" ON company_knowledge
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Admin/manager kezelheti a tudásbázist" ON company_knowledge
  FOR ALL USING (
    company_id = get_user_company_id() AND
    get_user_role() IN ('admin', 'manager')
  );
