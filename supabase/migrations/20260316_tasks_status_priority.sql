-- Tasks tábla kiegészítése: status és priority mezők
-- Ezek a mezők a MyTasksClient.tsx által használt mezők

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done')),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high'));

-- Index a státusz szerinti szűréshez
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
