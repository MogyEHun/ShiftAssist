// Teszt alkalmazottak létrehozása
// Futtatás: node scripts/seed-employees.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TEST_PASSWORD = 'Teszt1234!'

const EMPLOYEES = [
  { full_name: 'Kiss Péter',     email: 'kiss.peter@test.hu',     position: 'Pincér' },
  { full_name: 'Nagy Anna',      email: 'nagy.anna@test.hu',      position: 'Pultos' },
  { full_name: 'Kovács Márton',  email: 'kovacs.marton@test.hu',  position: 'Séf' },
  { full_name: 'Tóth Eszter',    email: 'toth.eszter@test.hu',    position: 'Pincér' },
  { full_name: 'Varga Dávid',    email: 'varga.david@test.hu',    position: 'Pultos' },
  { full_name: 'Szabó Réka',     email: 'szabo.reka@test.hu',     position: 'Hostess' },
  { full_name: 'Fekete Bence',   email: 'fekete.bence@test.hu',   position: 'Pincér' },
  { full_name: 'Molnár Lilla',   email: 'molnar.lilla@test.hu',   position: 'Pultos' },
  { full_name: 'Horváth Ádám',   email: 'horvath.adam@test.hu',   position: 'Séf' },
  { full_name: 'Simon Kata',     email: 'simon.kata@test.hu',     position: 'Hostess' },
]

async function main() {
  // Lekérdezzük az első céget
  const { data: companies, error: compErr } = await admin
    .from('companies')
    .select('id, name')
    .limit(1)
    .single()

  if (compErr || !companies) {
    console.error('Nincs cég az adatbázisban:', compErr?.message)
    process.exit(1)
  }

  console.log(`Cég: ${companies.name} (${companies.id})`)

  let created = 0
  let skipped = 0

  for (const emp of EMPLOYEES) {
    // Auth user létrehozása (email confirm nélkül)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: emp.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: emp.full_name }
    })

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        console.log(`⏭  Már létezik: ${emp.email}`)
        skipped++
        continue
      }
      console.error(`✗ ${emp.email}:`, authErr.message)
      continue
    }

    const userId = authData.user.id

    // Users tábla sor létrehozása
    const { error: userErr } = await admin.from('users').upsert({
      id: userId,
      company_id: companies.id,
      email: emp.email,
      full_name: emp.full_name,
      position: emp.position,
      role: 'employee',
      is_active: true,
    }, { onConflict: 'id' })

    if (userErr) {
      console.error(`✗ Users tábla hiba (${emp.email}):`, userErr.message)
      continue
    }

    console.log(`✓ Létrehozva: ${emp.full_name} (${emp.position}) — ${emp.email}`)
    created++
  }

  console.log(`\nKész! Létrehozva: ${created}, Kihagyva (már létezik): ${skipped}`)
  console.log(`\nJelszó minden fiókhoz: ${TEST_PASSWORD}`)
}

main().catch(console.error)
