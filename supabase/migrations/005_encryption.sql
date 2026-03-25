-- ============================================================
-- 005_encryption.sql – Alkalmazásszintű titkosítás oszlopok
-- GDPR megfelelőség: personal data encrypted with AES-256-GCM
--
-- FUTTATÁS: Supabase SQL Editor → Run
-- Ez ADDITIVE migráció — nem töri a meglévő kódot!
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- users tábla: titkosított mezők + keresési hash
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name_encrypted TEXT,      -- encrypt(full_name)
  ADD COLUMN IF NOT EXISTS email_encrypted    TEXT,       -- encrypt(email)
  ADD COLUMN IF NOT EXISTS phone_encrypted    TEXT,       -- encrypt(phone)
  ADD COLUMN IF NOT EXISTS email_hash         TEXT,       -- hashEmail(email) — kereséshez
  ADD COLUMN IF NOT EXISTS pseudonym          TEXT;       -- generatePseudonym(id) — audit loghoz

-- Egyedi index az email_hash-re (login és meghívó keresés)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash
  ON users(email_hash)
  WHERE email_hash IS NOT NULL;

-- Egyedi index a pseudonymre (audit log hivatkozás)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pseudonym
  ON users(pseudonym)
  WHERE pseudonym IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- audit_log tábla: pseudonym + ip_hash
-- ─────────────────────────────────────────────────────────────
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS user_pseudonym TEXT,   -- generatePseudonym(user_id) — nem visszakövethető
  ADD COLUMN IF NOT EXISTS ip_hash        TEXT;   -- hashEmail(ip_address) — nem visszafejthető

-- ─────────────────────────────────────────────────────────────
-- chat_history tábla: tartalom titkosítás
-- ─────────────────────────────────────────────────────────────
ALTER TABLE chat_history
  ADD COLUMN IF NOT EXISTS content_encrypted TEXT; -- encrypt(content)

-- ─────────────────────────────────────────────────────────────
-- ELLENŐRZÉS (opcionális, futtatható külön)
-- ─────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'users'
--   AND column_name IN ('full_name_encrypted','email_encrypted','phone_encrypted','email_hash','pseudonym');

-- ─────────────────────────────────────────────────────────────
-- MIGRÁCIÓ UTÁN (CSAK ha minden user full_name_encrypted IS NOT NULL):
--
-- ALTER TABLE users DROP COLUMN IF EXISTS full_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS email;
-- ALTER TABLE users DROP COLUMN IF EXISTS phone;
--
-- ALTER TABLE chat_history DROP COLUMN IF EXISTS content;
-- ─────────────────────────────────────────────────────────────
