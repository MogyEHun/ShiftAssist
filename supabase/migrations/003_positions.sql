-- Pozíciók tábla (pl. Pincér, Szakács, Pultos)
CREATE TABLE IF NOT EXISTS positions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_company_id ON positions(company_id);

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Saját cég pozícióit láthatja mindenki
CREATE POLICY "Saját cég pozícióit láthatja" ON positions
  FOR SELECT USING (company_id = get_user_company_id());

-- Admin/manager kezelhet pozíciókat
CREATE POLICY "Admin/manager kezelheti a pozíciókat" ON positions
  FOR ALL USING (
    company_id = get_user_company_id() AND
    get_user_role() IN ('owner', 'admin', 'manager')
  );
