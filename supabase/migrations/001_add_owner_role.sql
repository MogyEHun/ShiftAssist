-- Owner szerepkör hozzáadása a users táblához
-- Futtasd le a Supabase SQL Editorban!

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'employee'));
