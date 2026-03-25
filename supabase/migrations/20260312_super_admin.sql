-- Super admin tábla (platform tulajdonosok)
-- Ezek a felhasználók Supabase Auth-ban vannak, de NEM tartoznak céghez
CREATE TABLE IF NOT EXISTS super_admins (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin saját adat olvasás" ON super_admins
  FOR SELECT USING (id = auth.uid());

-- Rendszer eseménynapló
CREATE TABLE IF NOT EXISTS system_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,
  target_id   UUID,
  target_name TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_logs_created_idx ON system_logs (created_at DESC);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
-- Csak service role fér hozzá (admin client via SUPABASE_SERVICE_ROLE_KEY)

-- ============================================================
-- SAJÁT FIÓK HOZZÁADÁSA SUPER ADMIN-KÉNT:
-- Csere a VALUES-ban: id = te Supabase Auth user ID-d
-- ============================================================
INSERT INTO super_admins (id, email, full_name)
VALUES ('c99dbfbb-2c98-474b-82fd-7b61549c89f6', 'mogye.akos@gmail.com', 'Mogye Ákos')
ON CONFLICT (id) DO NOTHING;
