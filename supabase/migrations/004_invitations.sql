-- Dolgozói meghívók tábla
CREATE TABLE IF NOT EXISTS invitations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'employee'
               CHECK (role IN ('manager', 'employee')),
  position_id  UUID REFERENCES positions(id) ON DELETE SET NULL,
  hourly_rate  DECIMAL(10, 2),
  token        TEXT NOT NULL UNIQUE,
  invited_by   UUID NOT NULL REFERENCES users(id),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admin/manager láthatja a meghívókat
CREATE POLICY "Admin/manager láthatja a meghívókat" ON invitations
  FOR SELECT USING (
    company_id = get_user_company_id() AND
    get_user_role() IN ('owner', 'admin', 'manager')
  );

-- Admin/manager hozhat létre meghívót
CREATE POLICY "Admin/manager hozhat létre meghívót" ON invitations
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() AND
    get_user_role() IN ('owner', 'admin', 'manager')
  );

-- Token alapján bárki láthatja (meghívó elfogadáshoz) — service role kezeli
CREATE POLICY "Token alapján meghívó lekérése" ON invitations
  FOR SELECT USING (token IS NOT NULL);
