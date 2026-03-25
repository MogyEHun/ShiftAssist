CREATE TABLE IF NOT EXISTS availability_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'partial', 'unavailable')),
  from_time TIME,
  to_time TIME,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE availability_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_dates_company_select" ON availability_dates
  FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "availability_dates_own_write" ON availability_dates
  FOR ALL USING (user_id = auth.uid());
