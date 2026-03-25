'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserById } from '@/lib/data/users'
import type { ClockEntry } from '@/types'

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Nem vagy bejelentkezve')
  const profile = await getUserById(user.id)
  if (!profile) throw new Error('Felhasználói profil nem található')
  return profile
}

// Token feloldása: site vagy company tokenből cég/telephely azonosítás
async function resolveToken(token: string, admin: ReturnType<typeof createAdminClient>) {
  // Először telephelyek között keresünk
  const { data: site } = await admin
    .from('sites')
    .select('id, company_id, name')
    .eq('clock_token', token)
    .maybeSingle()
  if (site) return { companyId: site.company_id, siteId: site.id as string, siteName: site.name as string, companyName: null as string | null }

  // Ha nem találtuk, cégek között
  const { data: company } = await admin
    .from('companies')
    .select('id, name')
    .eq('clock_token', token)
    .maybeSingle()
  if (company) return { companyId: company.id, siteId: null, siteName: null, companyName: company.name as string }

  return null
}

// ------------------------------------------------------------
// QR token lekérése / létrehozása (cég vagy telephely)
// ------------------------------------------------------------
export async function getClockToken(siteId?: string): Promise<{ token: string | null; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()

    if (siteId) {
      const { data: site } = await admin
        .from('sites')
        .select('clock_token')
        .eq('id', siteId)
        .eq('company_id', currentUser.company_id)
        .single()

      if (site?.clock_token) return { token: site.clock_token }

      const newToken = crypto.randomUUID().replace(/-/g, '')
      await admin.from('sites').update({ clock_token: newToken }).eq('id', siteId)
      return { token: newToken }
    }

    // Cég-szintű token
    const { data: company } = await admin
      .from('companies')
      .select('clock_token')
      .eq('id', currentUser.company_id)
      .single()

    if (company?.clock_token) return { token: company.clock_token }

    const newToken = crypto.randomUUID().replace(/-/g, '')
    await admin.from('companies').update({ clock_token: newToken }).eq('id', currentUser.company_id)
    return { token: newToken }
  } catch (e) {
    return { token: null, error: String(e) }
  }
}

// ------------------------------------------------------------
// QR token megújítása (owner/admin only)
// ------------------------------------------------------------
export async function refreshClockToken(siteId?: string): Promise<{ token: string | null; error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin'].includes(currentUser.role)) {
      return { token: null, error: 'Nincs jogosultságod' }
    }
    const admin = createAdminClient()
    const newToken = crypto.randomUUID().replace(/-/g, '')

    if (siteId) {
      await admin.from('sites').update({ clock_token: newToken }).eq('id', siteId).eq('company_id', currentUser.company_id)
    } else {
      await admin.from('companies').update({ clock_token: newToken }).eq('id', currentUser.company_id)
    }

    revalidatePath('/dashboard/attendance')
    return { token: newToken }
  } catch (e) {
    return { token: null, error: String(e) }
  }
}

// ------------------------------------------------------------
// Saját clock státusz lekérése token alapján
// ------------------------------------------------------------
export async function getMyClockStatus(token: string): Promise<{
  isClockedIn: boolean
  clockInAt: string | null
  companyName: string | null
  siteName: string | null
  error?: string
}> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()

    const resolved = await resolveToken(token, admin)
    if (!resolved) return { isClockedIn: false, clockInAt: null, companyName: null, siteName: null, error: 'invalidToken' }
    if (resolved.companyId !== currentUser.company_id) return { isClockedIn: false, clockInAt: null, companyName: null, siteName: null, error: 'notSameCompany' }

    // Cég neve (ha company token)
    let companyName = resolved.companyName
    if (!companyName) {
      const { data: co } = await admin.from('companies').select('name').eq('id', resolved.companyId).single()
      companyName = co?.name ?? null
    }

    // Nyitott bejegyzés keresése
    const { data: openEntry } = await admin
      .from('clock_entries')
      .select('clock_in_at')
      .eq('user_id', currentUser.id)
      .eq('company_id', resolved.companyId)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      isClockedIn: !!openEntry,
      clockInAt: openEntry?.clock_in_at ?? null,
      companyName,
      siteName: resolved.siteName,
    }
  } catch (e) {
    return { isClockedIn: false, clockInAt: null, companyName: null, siteName: null, error: String(e) }
  }
}

// ------------------------------------------------------------
// Bejelentkezés (clock in)
// ------------------------------------------------------------
export async function clockIn(
  token: string,
  coords?: { lat: number; lon: number }
): Promise<{ error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()

    const resolved = await resolveToken(token, admin)
    if (!resolved) return { error: 'invalidToken' }
    if (resolved.companyId !== currentUser.company_id) return { error: 'notSameCompany' }

    const { data: existing } = await admin
      .from('clock_entries')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('company_id', resolved.companyId)
      .is('clock_out_at', null)
      .limit(1)
      .maybeSingle()

    if (existing) return { error: 'alreadyClockedInError' }

    await admin.from('clock_entries').insert({
      company_id: resolved.companyId,
      user_id: currentUser.id,
      site_id: resolved.siteId ?? (currentUser as any).site_id ?? null,
      lat_in: coords?.lat ?? null,
      lon_in: coords?.lon ?? null,
    })

    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

// ------------------------------------------------------------
// Kijelentkezés (clock out)
// ------------------------------------------------------------
export async function clockOut(
  token: string,
  coords?: { lat: number; lon: number }
): Promise<{ error?: string }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = createAdminClient()

    const resolved = await resolveToken(token, admin)
    if (!resolved) return { error: 'invalidToken' }
    if (resolved.companyId !== currentUser.company_id) return { error: 'notSameCompany' }

    const { data: openEntry } = await admin
      .from('clock_entries')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('company_id', resolved.companyId)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!openEntry) return { error: 'noOpenEntry' }

    await admin
      .from('clock_entries')
      .update({
        clock_out_at: new Date().toISOString(),
        lat_out: coords?.lat ?? null,
        lon_out: coords?.lon ?? null,
      })
      .eq('id', openEntry.id)

    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

// ------------------------------------------------------------
// Admin: jelenléti lista lekérdezése
// ------------------------------------------------------------
export async function getClockEntries(filters: {
  date?: string
  siteId?: string
}): Promise<ClockEntry[]> {
  try {
    const currentUser = await getCurrentUser()
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) return []

    const admin = createAdminClient()
    const date = filters.date ?? new Date().toISOString().slice(0, 10)
    const dayStart = `${date}T00:00:00.000Z`
    const dayEnd = `${date}T23:59:59.999Z`

    let query = admin
      .from('clock_entries')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .gte('clock_in_at', dayStart)
      .lte('clock_in_at', dayEnd)
      .order('clock_in_at', { ascending: true })

    if (filters.siteId) {
      query = query.eq('site_id', filters.siteId)
    } else if (currentUser.role === 'manager' && (currentUser as any).site_id) {
      query = query.eq('site_id', (currentUser as any).site_id)
    }

    const { data } = await query
    return (data ?? []) as ClockEntry[]
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// QR kód generálása Data URL-ként
// ------------------------------------------------------------
export async function generateQrDataUrl(token: string, baseUrl: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  const url = `${baseUrl}/clock?token=${token}`
  return QRCode.toDataURL(url, { width: 300, margin: 2 })
}
