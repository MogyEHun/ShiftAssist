/**
 * Multi-tenant Isolation Test Script
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/test-isolation.ts
 *
 * Ellenőrzi, hogy Cég A user tokenjével nem lehet Cég B adatait elérni.
 * Szükséges: legalább 2 cég + 1-1 user JWT token a .env.test fájlban.
 *
 * .env.test mezők:
 *   TEST_USER_A_TOKEN=<cégA user JWT>
 *   TEST_USER_B_TOKEN=<cégB user JWT>
 *   TEST_COMPANY_A_ID=<cégA UUID>
 *   TEST_COMPANY_B_ID=<cégB UUID>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const TOKEN_A = process.env.TEST_USER_A_TOKEN
const TOKEN_B = process.env.TEST_USER_B_TOKEN
const COMPANY_A = process.env.TEST_COMPANY_A_ID
const COMPANY_B = process.env.TEST_COMPANY_B_ID

if (!supabaseUrl) {
  console.error('❌ Hiányzó NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

if (!TOKEN_A || !TOKEN_B || !COMPANY_A || !COMPANY_B) {
  console.error(`
❌ Hiányzó test konfiguráció. Hozd létre a scripts/.env.test fájlt:

  TEST_USER_A_TOKEN=<cégA user JWT>
  TEST_USER_B_TOKEN=<cégB user JWT>
  TEST_COMPANY_A_ID=<cégA UUID>
  TEST_COMPANY_B_ID=<cégB UUID>

JWT tokent a Supabase Dashboard > Authentication > Users > három pont > "Generate token" menüből szerezhetsz.
`)
  process.exit(1)
}

// Client factory – user JWT alapján (RLS-t alkalmaz!)
function makeUserClient(token: string) {
  return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
}

interface TestResult {
  name: string
  table: string
  query: string
  passed: boolean
  rowCount: number
  details: string
}

const results: TestResult[] = []

async function runTest(
  name: string,
  table: string,
  query: string,
  clientToken: string,
  targetCompanyId: string,
  expectedRows: number,
): Promise<void> {
  const client = makeUserClient(clientToken)

  let rowCount = 0
  let error: string | null = null

  try {
    const { data, error: queryError } = await client
      .from(table)
      .select('id', { count: 'exact', head: false })
      .eq('company_id', targetCompanyId)
      .limit(10)

    if (queryError) {
      error = queryError.message
    } else {
      rowCount = data?.length ?? 0
    }
  } catch (err: any) {
    error = err.message
  }

  const passed = rowCount === expectedRows
  results.push({
    name,
    table,
    query,
    passed,
    rowCount,
    details: error
      ? `Hiba: ${error}`
      : passed
      ? `${rowCount} sor (várt: ${expectedRows}) ✓`
      : `🚨 ${rowCount} sor visszaadva! (várt: ${expectedRows}) – BIZTONSÁGI SZIVÁRGÁS!`,
  })
}

async function runIsolationTests(): Promise<void> {
  console.log('\n🔐 ShiftSync Multi-tenant Izoláció Teszt\n')
  console.log('━'.repeat(70))
  console.log(`📌 Cég A: ${COMPANY_A}`)
  console.log(`📌 Cég B: ${COMPANY_B}`)
  console.log('━'.repeat(70))
  console.log()

  const tables = ['shifts', 'leave_requests', 'swap_requests', 'audit_log', 'users']

  // Cég A tokenjével Cég B adatait kérdezzük → 0 sort kell kapni
  for (const table of tables) {
    await runTest(
      `Cég A → Cég B (${table})`,
      table,
      `SELECT FROM ${table} WHERE company_id = '${COMPANY_B}'`,
      TOKEN_A!,
      COMPANY_B!,
      0,
    )
  }

  // Cég B tokenjével Cég A adatait kérdezzük → 0 sort kell kapni
  for (const table of tables) {
    await runTest(
      `Cég B → Cég A (${table})`,
      table,
      `SELECT FROM ${table} WHERE company_id = '${COMPANY_A}'`,
      TOKEN_B!,
      COMPANY_A!,
      0,
    )
  }

  // Eredmények kiírása
  let passed = 0
  let failed = 0

  for (const r of results) {
    const icon = r.passed ? '✅' : '🚨'
    console.log(`${icon} ${r.name.padEnd(40)} ${r.details}`)
    if (r.passed) passed++
    else failed++
  }

  console.log()
  console.log('─'.repeat(70))
  console.log(`\n📊 Eredmény: ${passed}/${results.length} teszten átment\n`)

  if (failed > 0) {
    console.log('🚨 KRITIKUS BIZTONSÁGI HIBA – adatszivárgás detektálva!')
    console.log('   Ellenőrizd a RLS policyk beállítását a Supabase Dashboardon.\n')
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   Tábla: ${r.table}`)
        console.log(`   SQL: ${r.query}`)
        console.log()
      })
    process.exit(2)
  } else {
    console.log('✅ Minden izoláció teszt ÁTMENT – nincs kereszt-cég adatszivárgás!\n')
    process.exit(0)
  }
}

runIsolationTests().catch((err) => {
  console.error('❌ Teszt hiba:', err)
  process.exit(1)
})
