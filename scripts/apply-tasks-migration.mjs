import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { error } = await sb.from('tasks').select('status').limit(1)
if (!error) {
  console.log('✓ status mező már létezik')
} else {
  console.log('status mező hiányzik, migration szükséges a Supabase SQL editorban:')
  console.log(`
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done')),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high'));
  `)
}
