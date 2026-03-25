/**
 * RLS Policy Audit Script
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/audit-rls.ts
 *
 * Ellenőrzi, hogy minden tábla esetén:
 * - RLS be van-e kapcsolva
 * - Van-e company_id alapú policy (multi-tenant izoláció)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Hiányzó env var: NEXT_PUBLIC_SUPABASE_URL vagy SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

// Táblák, amiknek multi-tenant izolációt kell biztosítaniuk
const EXPECTED_TABLES = [
  'users',
  'companies',
  'shifts',
  'leave_requests',
  'swap_requests',
  'audit_log',
  'shift_templates',
  'overtime_config',
  'availability',
  'open_shifts',
  'chat_history',
  'billing_history',
  'push_subscriptions',
]

interface RlsStatus {
  table: string
  rlsEnabled: boolean
  policies: string[]
  hasCompanyPolicy: boolean
  status: 'OK' | 'WARN' | 'CRITICAL'
}

async function auditRls(): Promise<void> {
  console.log('\n🔍 ShiftSync RLS Policy Audit\n')
  console.log('━'.repeat(80))

  // Lekérdezzük az RLS státuszt minden táblára
  const { data: rlsData, error: rlsError } = await supabase
    .rpc('get_rls_status')
    .select('*')

  // Ha nincs ilyen RPC, raw SQL-el próbáljuk
  const { data: tableRls, error: tableRlsError } = await supabase
    .from('pg_tables')
    .select('tablename, rowsecurity')
    .eq('schemaname', 'public')
    .in('tablename', EXPECTED_TABLES) as any

  if (tableRlsError && !tableRls) {
    // Fallback: information_schema lekérdezés service role-lal
    console.log('ℹ️  Direkt pg_tables hozzáférés nem lehetséges – policy neveket ellenőrzünk\n')
  }

  // Policies lekérdezése
  const { data: policiesData } = await supabase
    .rpc('audit_list_policies') as any

  const results: RlsStatus[] = []

  for (const tableName of EXPECTED_TABLES) {
    const tableInfo = tableRls?.find((t: any) => t.tablename === tableName)
    const tablePolicies: string[] = policiesData
      ?.filter((p: any) => p.tablename === tableName)
      ?.map((p: any) => p.policyname) ?? []

    const rlsEnabled = tableInfo?.rowsecurity ?? (tablePolicies.length > 0)
    const hasCompanyPolicy = tablePolicies.some(
      (p) => p.toLowerCase().includes('company') || p.toLowerCase().includes('tenant')
    )

    let status: RlsStatus['status'] = 'OK'
    if (!rlsEnabled) status = 'CRITICAL'
    else if (!hasCompanyPolicy && !['companies'].includes(tableName)) status = 'WARN'

    results.push({
      table: tableName,
      rlsEnabled,
      policies: tablePolicies,
      hasCompanyPolicy,
      status,
    })
  }

  // Táblázat kiírása
  const colW = [24, 8, 14, 10]
  const header = [
    'TÁBLA'.padEnd(colW[0]),
    'RLS'.padEnd(colW[1]),
    'COMPANY POLICY'.padEnd(colW[2]),
    'STÁTUSZ'.padEnd(colW[3]),
  ].join(' │ ')

  console.log(header)
  console.log('─'.repeat(header.length))

  let criticalCount = 0
  let warnCount = 0

  for (const r of results) {
    const statusIcon = r.status === 'OK' ? '✅' : r.status === 'WARN' ? '⚠️ ' : '🚨'
    const rlsIcon = r.rlsEnabled ? '✓' : '✗'
    const cpIcon = r.hasCompanyPolicy ? '✓' : r.table === 'companies' ? '–' : '✗'

    const row = [
      r.table.padEnd(colW[0]),
      rlsIcon.padEnd(colW[1]),
      cpIcon.padEnd(colW[2]),
      `${statusIcon} ${r.status}`.padEnd(colW[3]),
    ].join(' │ ')

    console.log(row)

    if (r.policies.length > 0) {
      console.log(`${''.padEnd(colW[0] + 3)}Policies: ${r.policies.join(', ')}`)
    }

    if (r.status === 'CRITICAL') criticalCount++
    if (r.status === 'WARN') warnCount++
  }

  console.log('─'.repeat(header.length))
  console.log(`\n📊 Összesítés: ${results.length - criticalCount - warnCount} OK  │  ${warnCount} WARN  │  ${criticalCount} CRITICAL\n`)

  if (criticalCount > 0) {
    console.log('🚨 KRITIKUS: Az alábbi táblák RLS nélkül vannak – AZONNALI beavatkozás szükséges!')
    results.filter(r => r.status === 'CRITICAL').forEach(r => console.log(`   • ${r.table}`))
    console.log()
  }

  if (warnCount > 0) {
    console.log('⚠️  FIGYELMEZTETÉS: Az alábbi táblák company_id policy nélkül vannak:')
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`   • ${r.table}`))
    console.log()
  }

  if (criticalCount === 0 && warnCount === 0) {
    console.log('✅ Minden tábla RLS védelemmel rendelkezik!\n')
  }

  // Kilépési kód: 0=OK, 1=van figyelmeztetés/kritikus hiba
  process.exit(criticalCount > 0 ? 2 : warnCount > 0 ? 1 : 0)
}

auditRls().catch((err) => {
  console.error('❌ Audit hiba:', err)
  process.exit(1)
})
