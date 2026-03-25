// Alap pozíciók törlése – a cég maga adja meg a pozíciókat
// Futtatás: node scripts/delete-default-positions.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const DEFAULT_POSITIONS = ['Pincér', 'Pultos', 'Séf', 'Hostess', 'Vezető']

async function main() {
  const { data: companies } = await admin
    .from('companies')
    .select('id, name')
    .limit(1)
    .single()

  console.log(`Cég: ${companies.name} (${companies.id})`)

  const { data: deleted, error } = await admin
    .from('positions')
    .delete()
    .eq('company_id', companies.id)
    .in('name', DEFAULT_POSITIONS)
    .select()

  if (error) {
    console.error('Hiba:', error.message)
    process.exit(1)
  }

  console.log(`Törölve: ${deleted.length} pozíció`)
  deleted.forEach(p => console.log(`  - ${p.name}`))
}

main().catch(console.error)
