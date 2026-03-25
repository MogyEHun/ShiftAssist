// Teszt szabadságkérelmek generálása az összes alkalmazottnak
// Futtatás: node scripts/seed-leave-requests.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const TYPES = ['vacation', 'sick', 'personal', 'vacation', 'vacation']
const STATUSES = ['pending', 'pending', 'approved', 'rejected', 'pending']
const REASONS = [
  'Nyári nyaralás',
  'Orvosi kivizsgálás',
  'Családi esemény',
  'Húsvéti hosszú hétvége',
  'Egyéb személyes ok',
]

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function main() {
  // 1. Lekérjük az összes aktív felhasználót (az első company-ból)
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, company_id')
    .eq('is_active', true)

  if (userErr || !users?.length) {
    console.error('Nem sikerült lekérni a felhasználókat:', userErr?.message)
    process.exit(1)
  }

  console.log(`${users.length} felhasználó találva. Kérelmek generálása...`)

  const inserts = users.map((user, i) => {
    const idx = i % TYPES.length
    // Különböző jövőbeli dátumok minden felhasználónak
    const startOffset = 5 + i * 7
    const startDate = addDays('2026-03-20', startOffset)
    const endDate = addDays(startDate, 2 + (i % 4))

    return {
      company_id: user.company_id,
      user_id: user.id,
      type: TYPES[idx],
      status: STATUSES[idx],
      start_date: startDate,
      end_date: endDate,
      reason: REASONS[idx],
      manager_note: STATUSES[idx] === 'rejected' ? 'Sajnos ekkor nem tudjuk engedélyezni.' : null,
    }
  })

  const { error: insertErr } = await supabase.from('leave_requests').insert(inserts)

  if (insertErr) {
    console.error('Beszúrás sikertelen:', insertErr.message)
    process.exit(1)
  }

  console.log(`✓ ${inserts.length} teszt szabadságkérelem sikeresen létrehozva.`)
  inserts.forEach((r, i) => {
    console.log(`  [${i + 1}] user:${r.user_id.slice(0, 8)}… | ${r.type} | ${r.start_date}–${r.end_date} | ${r.status}`)
  })
}

main()
