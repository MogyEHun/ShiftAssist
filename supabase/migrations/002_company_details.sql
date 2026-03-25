-- Cég típus, méret és onboarding állapot hozzáadása
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'other'
    CHECK (type IN ('restaurant', 'bar', 'hotel', 'other')),
  ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'small'
    CHECK (size IN ('small', 'medium', 'large')),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
