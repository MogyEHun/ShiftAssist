-- Tasks: assigned_to_ids tömb, több személyhez rendelhetőség
-- Ha bármelyik hozzárendelt személy kész jelöli, a feladat kész lesz

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to_ids UUID[] NOT NULL DEFAULT '{}';

-- Meglévő single assigned_to migrálása tömbbe
UPDATE tasks
  SET assigned_to_ids = ARRAY[assigned_to]
  WHERE assigned_to IS NOT NULL
    AND array_length(assigned_to_ids, 1) IS NULL;

-- Index a tömb kereséshez (GIN)
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_ids ON tasks USING GIN (assigned_to_ids);
