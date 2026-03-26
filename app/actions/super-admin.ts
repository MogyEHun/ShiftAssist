'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt, hashEmail } from '@/lib/encryption'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

// ──────────────────────────────────────────────
// Auth ellenőrzés
// ──────────────────────────────────────────────

export async function verifySuperAdmin(): Promise<{ id: string; email: string; full_name: string | null } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('super_admins')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single()

  return data ?? null
}

// ──────────────────────────────────────────────
// Összesített dashboard statisztikák
// ──────────────────────────────────────────────

export async function getSuperAdminStats() {
  const admin = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalCompanies },
    { count: totalUsers },
    { count: activeCompanies },
    { count: inactiveCompanies },
    { count: trialCompanies },
    { count: newCompanies },
  ] = await Promise.all([
    admin.from('companies').select('*', { count: 'exact', head: true }),
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('companies').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    admin.from('companies').select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled'),
    admin.from('companies').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trialing'),
    admin.from('companies').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
  ])

  return {
    totalCompanies: totalCompanies ?? 0,
    totalUsers: totalUsers ?? 0,
    activeCompanies: activeCompanies ?? 0,
    inactiveCompanies: inactiveCompanies ?? 0,
    trialCompanies: trialCompanies ?? 0,
    newCompanies: newCompanies ?? 0,
  }
}

// ──────────────────────────────────────────────
// Összes cég listája
// ──────────────────────────────────────────────

export async function getAllCompanies() {
  const admin = createAdminClient()

  const { data: companies } = await admin
    .from('companies')
    .select('id, name, slug, subscription_plan, subscription_status, created_at, trial_ends_at')
    .order('created_at', { ascending: false })

  if (!companies) return []

  // Alkalmazottak száma minden céghez
  const companiesWithCounts = await Promise.all(
    companies.map(async (company) => {
      const { count } = await admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('is_active', true)

      return { ...company, employee_count: count ?? 0 }
    })
  )

  return companiesWithCounts
}

export type CompanyListItem = Awaited<ReturnType<typeof getAllCompanies>>[number]

// ──────────────────────────────────────────────
// Egy cég részletei
// ──────────────────────────────────────────────

export async function getCompanyDetail(companyId: string) {
  const admin = createAdminClient()

  const [{ data: company }, users] = await Promise.all([
    admin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single(),
    (await import('@/lib/data/users')).getCompanyUsers(companyId),
  ])

  if (!company) return null
  return { company, users }
}

// ──────────────────────────────────────────────
// Cég aktiválás / deaktiválás
// ──────────────────────────────────────────────

export async function setCompanyStatus(
  companyId: string,
  status: 'active' | 'canceled',
  actorEmail: string
) {
  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()

  await admin
    .from('companies')
    .update({ subscription_status: status, updated_at: new Date().toISOString() })
    .eq('id', companyId)

  await logAction(
    actorEmail,
    status === 'active' ? 'company_activated' : 'company_deactivated',
    companyId,
    company?.name ?? companyId,
    { status }
  )
}

// ──────────────────────────────────────────────
// Cég soft törlése (összes user deaktiválása)
// ──────────────────────────────────────────────

export async function deactivateAllCompanyUsers(companyId: string, actorEmail: string) {
  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()

  await admin
    .from('users')
    .update({ is_active: false })
    .eq('company_id', companyId)

  await admin
    .from('companies')
    .update({ subscription_status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', companyId)

  await logAction(actorEmail, 'company_soft_deleted', companyId, company?.name ?? companyId)
}

// ──────────────────────────────────────────────
// Platform statisztikák grafikonhoz
// ──────────────────────────────────────────────

export async function getPlatformStats() {
  const admin = createAdminClient()

  // Cégek havi bontásban (elmúlt 12 hónap)
  const { data: companies } = await admin
    .from('companies')
    .select('created_at')
    .order('created_at', { ascending: true })

  // Top 10 cég alkalmazottak szerint
  const { data: allUsers } = await admin
    .from('users')
    .select('company_id, companies(name)')
    .eq('is_active', true)

  // Havi aggregálás
  const monthlyMap: Record<string, number> = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = 0
  }

  let cumulative = 0
  const allCompaniesForChart = companies ?? []
  const monthlyGrowth = Object.entries(monthlyMap).map(([month]) => {
    const count = allCompaniesForChart.filter((c) => {
      const d = new Date(c.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return key === month
    }).length
    cumulative += count
    return { month, new: count, total: cumulative }
  })

  // Top cégek
  const companyUserCount: Record<string, { name: string; count: number }> = {}
  for (const u of allUsers ?? []) {
    const cid = u.company_id
    const name = (u.companies as unknown as { name: string } | null)?.name ?? cid
    if (!companyUserCount[cid]) companyUserCount[cid] = { name, count: 0 }
    companyUserCount[cid].count++
  }

  const topCompanies = Object.values(companyUserCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return { monthlyGrowth, topCompanies }
}

// ──────────────────────────────────────────────
// Rendszer logok
// ──────────────────────────────────────────────

export async function getSystemLogs(limit = 100, from?: string, to?: string) {
  const admin = createAdminClient()

  let query = admin
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data } = await query
  return data ?? []
}

export async function logAction(
  actorEmail: string,
  action: string,
  targetId?: string,
  targetName?: string,
  details?: Record<string, unknown>
) {
  const admin = createAdminClient()

  await admin.from('system_logs').insert({
    actor_email: actorEmail,
    action,
    target_id: targetId ?? null,
    target_name: targetName ?? null,
    details: details ?? null,
  })
}

// ──────────────────────────────────────────────
// Törlési kérelmek
// ──────────────────────────────────────────────

export interface DeletionRequest {
  userId: string
  fullName: string
  email: string
  role: string
  companyId: string
  companyName: string
  deletionDate: string
  daysLeft: number
}

export async function getDeletionRequests(): Promise<DeletionRequest[]> {
  const admin = createAdminClient()

  const { data: users } = await admin
    .from('users')
    .select('id, full_name_encrypted, email_encrypted, role, company_id, deletion_requested_at, companies(name)')
    .not('deletion_requested_at', 'is', null)
    .eq('is_active', false)
    .order('deletion_requested_at', { ascending: true })

  if (!users) return []

  const now = Date.now()

  return users.map((u) => {
    const fullName = u.full_name_encrypted ? decrypt(u.full_name_encrypted) : '(anonimizált)'
    const email = u.email_encrypted ? decrypt(u.email_encrypted) : '–'
    const companyName = (u.companies as unknown as { name: string } | null)?.name ?? '–'
    const deletionDate = u.deletion_requested_at as string
    const daysLeft = Math.ceil((new Date(deletionDate).getTime() - now) / (1000 * 60 * 60 * 24))

    return {
      userId: u.id,
      fullName,
      email,
      role: u.role,
      companyId: u.company_id,
      companyName,
      deletionDate,
      daysLeft,
    }
  })
}

// ──────────────────────────────────────────────
// Cég tevékenység napló (audit_log + AI)
// ──────────────────────────────────────────────

export interface CompanyActivityLog {
  id: string
  source: 'audit' | 'ai'
  action: string
  entityType: string | null
  companyId: string
  companyName: string
  userName: string | null
  createdAt: string
}

export async function getCompanyActivityLogs(limit = 200, from?: string, to?: string, companyId?: string): Promise<CompanyActivityLog[]> {
  const admin = createAdminClient()

  // 1. audit_log – minden cég esemény
  let auditQuery = admin
    .from('audit_log')
    .select('id, action, entity_type, company_id, user_id, created_at, companies(name)')
    .not('company_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (from) auditQuery = auditQuery.gte('created_at', from)
  if (to) auditQuery = auditQuery.lte('created_at', to)
  if (companyId) auditQuery = auditQuery.eq('company_id', companyId)

  const { data: auditRows } = await auditQuery

  // 2. AI kérések
  let aiQuery = admin
    .from('ai_schedule_requests')
    .select('id, company_id, created_at, companies(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (from) aiQuery = aiQuery.gte('created_at', from)
  if (to) aiQuery = aiQuery.lte('created_at', to)
  if (companyId) aiQuery = aiQuery.eq('company_id', companyId)

  const { data: aiRows } = await aiQuery

  // user ID-k gyűjtése a dekriptáláshoz
  const userIds = Array.from(new Set((auditRows ?? []).map((r: any) => r.user_id).filter(Boolean)))
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name_encrypted')
      .in('id', userIds)
    for (const u of users ?? []) {
      userMap[u.id] = u.full_name_encrypted ? decrypt(u.full_name_encrypted) : '–'
    }
  }

  const auditLogs: CompanyActivityLog[] = (auditRows ?? []).map((r: any) => ({
    id: r.id,
    source: 'audit' as const,
    action: r.action,
    entityType: r.entity_type ?? null,
    companyId: r.company_id,
    companyName: (r.companies as { name: string } | null)?.name ?? '–',
    userName: r.user_id ? (userMap[r.user_id] ?? '–') : null,
    createdAt: r.created_at,
  }))

  const aiLogs: CompanyActivityLog[] = (aiRows ?? []).map((r: any) => ({
    id: r.id,
    source: 'ai' as const,
    action: 'ai.schedule_request',
    entityType: 'ai',
    companyId: r.company_id,
    companyName: (r.companies as { name: string } | null)?.name ?? '–',
    userName: null,
    createdAt: r.created_at,
  }))

  return [...auditLogs, ...aiLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

// ──────────────────────────────────────────────
// Super Admin felhasználók kezelése
// ──────────────────────────────────────────────

export async function getSuperAdmins() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('super_admins')
    .select('id, email, full_name, created_at')
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function addSuperAdmin(email: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const h = hashEmail(email.toLowerCase().trim())
  const { data: user } = await admin
    .from('users')
    .select('id, email_encrypted, full_name_encrypted')
    .eq('email_hash', h)
    .maybeSingle()
  if (!user) return { error: 'Nem található felhasználó ezzel az email-lel.' }
  const { error } = await admin.from('super_admins').insert({
    id: user.id,
    email: email.toLowerCase().trim(),
    full_name: user.full_name_encrypted ? decrypt(user.full_name_encrypted) : null,
  })
  if (error) return { error: 'Már super admin, vagy hiba történt.' }
  return {}
}

export async function removeSuperAdmin(targetId: string): Promise<{ error?: string }> {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) return { error: 'Nincs jogosultság.' }
  if (targetId === superAdmin.id) return { error: 'Saját magadat nem távolíthatod el.' }
  const admin = createAdminClient()
  await admin.from('super_admins').delete().eq('id', targetId)
  return {}
}

// ──────────────────────────────────────────────
// Előfizetés kezelés
// ──────────────────────────────────────────────

export async function changePlan(companyId: string, plan: 'basic' | 'premium'): Promise<void> {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) return
  const admin = createAdminClient()
  await admin
    .from('companies')
    .update({ subscription_plan: plan, updated_at: new Date().toISOString() })
    .eq('id', companyId)
  await logAction(superAdmin.email, 'plan_changed', companyId, undefined, { plan })
  revalidatePath(`/super-admin/companies/${companyId}`)
}

export async function extendTrial(companyId: string, days: number): Promise<void> {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) return
  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('trial_ends_at')
    .eq('id', companyId)
    .single()
  const base = company?.trial_ends_at && new Date(company.trial_ends_at) > new Date()
    ? new Date(company.trial_ends_at)
    : new Date()
  base.setDate(base.getDate() + days)
  await admin
    .from('companies')
    .update({ trial_ends_at: base.toISOString(), subscription_status: 'trialing', updated_at: new Date().toISOString() })
    .eq('id', companyId)
  await logAction(superAdmin.email, 'trial_extended', companyId, undefined, { days })
  revalidatePath(`/super-admin/companies/${companyId}`)
}

// ──────────────────────────────────────────────
// Revenue dashboard
// ──────────────────────────────────────────────

export interface RevenueStats {
  mrr: number
  arr: number
  avgPerCompany: number
  churnCount: number
  monthlyRevenue: { month: string; amount: number }[]
  topCompanies: { name: string; plan: string; amount: number }[]
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const admin = createAdminClient()
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: billing } = await admin
    .from('billing_history')
    .select('company_id, period_start, amount_huf, status, plan, companies(name)')
    .order('period_start', { ascending: true })

  const rows = billing ?? []

  // MRR = aktuális hónap paid számlák
  const mrrRows = rows.filter(r => {
    const m = r.period_start?.slice(0, 7)
    return m === currentMonth && r.status === 'paid'
  })
  const mrr = mrrRows.reduce((s, r) => s + (r.amount_huf ?? 0), 0)

  // Churn: elmúlt 30 napban canceled cégek
  const { count: churnCount } = await admin
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'canceled')
    .gte('updated_at', thirtyDaysAgo)

  // Aktív cégek száma MRR-hez
  const { count: activeCount } = await admin
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'active')

  // Havi bontás – elmúlt 12 hónap
  const monthlyMap: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthlyMap[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0
  }
  for (const r of rows) {
    const m = r.period_start?.slice(0, 7)
    if (m && m in monthlyMap && r.status === 'paid') {
      monthlyMap[m] += r.amount_huf ?? 0
    }
  }
  const monthlyRevenue = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }))

  // Top cégek
  const companyTotals: Record<string, { name: string; plan: string; amount: number }> = {}
  for (const r of rows) {
    if (r.status !== 'paid') continue
    const cid = r.company_id
    const name = (r.companies as unknown as { name: string } | null)?.name ?? cid
    if (!companyTotals[cid]) companyTotals[cid] = { name, plan: r.plan ?? '–', amount: 0 }
    companyTotals[cid].amount += r.amount_huf ?? 0
  }
  const topCompanies = Object.values(companyTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  return {
    mrr,
    arr: mrr * 12,
    avgPerCompany: activeCount && activeCount > 0 ? Math.round(mrr / activeCount) : 0,
    churnCount: churnCount ?? 0,
    monthlyRevenue,
    topCompanies,
  }
}

// ──────────────────────────────────────────────
// Felhasználó keresés email alapján
// ──────────────────────────────────────────────

export async function searchUserByEmail(email: string): Promise<{
  userId: string; fullName: string; companyId: string; companyName: string; role: string; isActive: boolean
} | null> {
  const admin = createAdminClient()
  const h = hashEmail(email.toLowerCase().trim())
  const { data } = await admin
    .from('users')
    .select('id, full_name_encrypted, company_id, role, is_active, companies(name)')
    .eq('email_hash', h)
    .maybeSingle()
  if (!data) return null
  return {
    userId: data.id,
    fullName: data.full_name_encrypted ? decrypt(data.full_name_encrypted) : '–',
    companyId: data.company_id,
    companyName: (data.companies as unknown as { name: string } | null)?.name ?? '–',
    role: data.role,
    isActive: data.is_active,
  }
}

// ──────────────────────────────────────────────
// Belső megjegyzések
// ──────────────────────────────────────────────

export async function updateCompanyNotes(companyId: string, notes: string): Promise<void> {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) return
  const admin = createAdminClient()
  await admin
    .from('companies')
    .update({ internal_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', companyId)
  await logAction(superAdmin.email, 'company_notes_updated', companyId)
  revalidatePath(`/super-admin/companies/${companyId}`)
}

// ──────────────────────────────────────────────
// Broadcast email
// ──────────────────────────────────────────────

export async function sendBroadcast(
  subject: string,
  message: string,
  target: 'all' | 'active' | 'trialing' | 'canceled'
): Promise<{ sent: number; error?: string }> {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) return { sent: 0, error: 'Nincs jogosultság.' }

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ShiftAssist <noreply@shiftsync.hu>'

  // Owner felhasználók lekérdezése a szűrt cégekből
  let companiesQuery = admin.from('companies').select('id, subscription_status')
  if (target !== 'all') companiesQuery = companiesQuery.eq('subscription_status', target)
  const { data: companies } = await companiesQuery

  if (!companies?.length) return { sent: 0 }

  const companyIds = companies.map(c => c.id)
  const { data: owners } = await admin
    .from('users')
    .select('id, email_encrypted')
    .in('company_id', companyIds)
    .eq('role', 'owner')
    .eq('is_active', true)

  let sent = 0
  for (const owner of owners ?? []) {
    const email = owner.email_encrypted ? decrypt(owner.email_encrypted) : null
    if (!email) continue
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><p>${message.replace(/\n/g, '<br>')}</p><hr><p style="color:#999;font-size:12px">ShiftAssist platform üzenet</p></div>`,
      })
      sent++
      // Rate limit: ~10/s
      if (sent % 10 === 0) await new Promise(r => setTimeout(r, 1000))
    } catch {
      // Folytatás hiba esetén
    }
  }

  await logAction(superAdmin.email, 'broadcast_sent', undefined, subject, { target, sent })
  return { sent }
}

// ──────────────────────────────────────────────
// Feature flags
// ──────────────────────────────────────────────


export async function setFeatureFlag(companyId: string, flag: string, enabled: boolean): Promise<void> {
  const superAdmin = await verifySuperAdmin()
  if (!superAdmin) return
  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('feature_flags')
    .eq('id', companyId)
    .single()
  const flags = (company?.feature_flags as Record<string, boolean>) ?? {}
  flags[flag] = enabled
  await admin
    .from('companies')
    .update({ feature_flags: flags, updated_at: new Date().toISOString() })
    .eq('id', companyId)
  await logAction(superAdmin.email, 'feature_flag_changed', companyId, undefined, { flag, enabled })
  revalidatePath(`/super-admin/companies/${companyId}`)
}

// ──────────────────────────────────────────────
// Cég adatexport
// ──────────────────────────────────────────────

export async function exportCompanyData(companyId: string) {
  const detail = await getCompanyDetail(companyId)
  if (!detail) return null
  const admin = createAdminClient()
  const { data: billing } = await admin
    .from('billing_history')
    .select('*')
    .eq('company_id', companyId)
    .order('period_start', { ascending: false })
  return { company: detail.company, users: detail.users, billing: billing ?? [] }
}
