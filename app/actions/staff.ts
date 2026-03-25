'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend } from '@/lib/resend'
import crypto from 'crypto'
import { logAudit } from './audit'
import { filterUsersForRole } from '@/lib/response-filter'
import { sanitizeName, sanitizeNote } from '@/lib/sanitize'
import { canAddEmployee } from '@/lib/billing'
import { getCompanyUsers, getUserById, updateUserEncrypted } from '@/lib/data/users'


// ============================================================
// Dolgozók lekérése
// ============================================================
export async function getStaff() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.', data: null }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: 'Felhasználó nem található.', data: null }

  // Visszafejtett user lista a titkosítási rétegen keresztül
  const staff = await getCompanyUsers(userData.company_id)

  // Role-alapú mezőszűrés: hourly_rate csak owner/manager/admin látja
  const filtered = filterUsersForRole(staff as never[], userData.role)

  return { data: filtered, error: null }
}

// ============================================================
// Dolgozó meghívása
// ============================================================
export async function inviteStaff(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  const email = sanitizeName(formData.get('email')).toLowerCase()
  const role = formData.get('role') as 'manager' | 'employee'
  const positionId = formData.get('positionId') as string | null
  const hourlyRateRaw = formData.get('hourlyRate') as string
  const hourlyRate = hourlyRateRaw ? parseFloat(hourlyRateRaw) : null

  if (!email || !role) return { error: 'Email cím és szerepkör megadása kötelező.' }
  if (!email.includes('@')) return { error: 'Érvénytelen email cím.' }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, companies(name)')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) return { error: 'Cég nem található.' }

  // Meghívó nevét a titkosítási rétegen keresztül kérjük le
  const inviterUser = await getUserById(user.id)

  // Seat limit ellenőrzés (4.3)
  const { data: companyData } = await supabase
    .from('companies')
    .select('seat_count, max_employees, subscription_status')
    .eq('id', userData.company_id)
    .single()

  if (companyData && !canAddEmployee(companyData)) {
    return { error: `Elérted a maximum dolgozói limitet. Növeld a csomagot a Számlázás oldalon.` }
  }

  // Aktív dolgozók száma ellenőrzés
  const { count: activeCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData.company_id)
    .eq('is_active', true)

  const seatLimit = companyData?.seat_count ?? companyData?.max_employees ?? 5
  if (companyData?.subscription_status !== 'trialing' && activeCount !== null && activeCount >= seatLimit) {
    return { error: `Elérted a ${seatLimit} fős limitet. Növeld a csomagot a Számlázás oldalon.` }
  }

  const companiesData = userData.companies as unknown as { name: string } | { name: string }[] | null
  const companyName = (Array.isArray(companiesData) ? companiesData[0] : companiesData)?.name ?? 'ShiftAssist'
  const inviterName = inviterUser?.full_name ?? 'ShiftAssist'

  // Egyedi token generálás
  const token = crypto.randomBytes(32).toString('hex')

  const adminClient = createAdminClient()

  // Meghívó rekord létrehozása
  const { error: inviteError } = await adminClient.from('invitations').insert({
    company_id: userData.company_id,
    email,
    role,
    position_id: positionId || null,
    hourly_rate: hourlyRate,
    token,
    invited_by: user.id,
  })

  if (inviteError) {
    return { error: 'Hiba a meghívó létrehozásakor: ' + inviteError.message }
  }

  // Meghívó email küldése Resend-en keresztül
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const roleLabel = role === 'manager' ? 'Vezető' : 'Dolgozó'

  const { error: emailError } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: `${inviterName} meghívott a ${companyName} csapatába – ShiftAssist`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a5c3a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ShiftAssist</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1a5c3a; margin-top: 0;">Meghívót kaptál! 🎉</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${inviterName}</strong> meghívott a <strong>${companyName}</strong> csapatába
            a ShiftAssist beosztáskezelő rendszerbe, <strong>${roleLabel}</strong> szerepkörrel.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Kattints az alábbi gombra a regisztrációhoz és a csatlakozáshoz:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}"
               style="background: #1a5c3a; color: white; padding: 14px 32px; border-radius: 8px;
                      text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Meghívó elfogadása
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px;">
            Ez a meghívó 7 napig érvényes. Ha nem te kaptad ezt az emailt, hagyd figyelmen kívül.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            ShiftAssist – Vendéglátós beosztáskezelő
          </p>
        </div>
      </div>
    `,
  })

  if (emailError) {
    // Meghívó törölése ha az email sikertelen
    await adminClient.from('invitations').delete().eq('token', token)
    return { error: 'Hiba az email küldésekor. Ellenőrizd a Resend beállításokat.' }
  }

  await logAudit(userData.company_id, user.id, 'staff.invite', 'invitation', null, null, { email, role })
  return { success: true }
}

// ============================================================
// Meghívó link generálása email nélkül (teszteléshez / email nélküli meghíváshoz)
// ============================================================
export async function generateInviteLink(email: string, role: 'manager' | 'employee') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  const cleanEmail = (email ?? '').toLowerCase().trim()
  if (!cleanEmail) return { error: 'Kérjük add meg az email címet.' }
  if (!cleanEmail.includes('@')) return { error: 'Érvénytelen email cím.' }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role, companies(name)')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) return { error: 'Cég nem található.' }
  if (!['owner', 'admin', 'manager'].includes(userData.role)) return { error: 'Nincs jogosultságod.' }

  const token = crypto.randomBytes(32).toString('hex')
  const adminClient = createAdminClient()

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await adminClient.from('invitations').insert({
    company_id: userData.company_id,
    email: cleanEmail,
    role,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  })

  if (inviteError) return { error: 'Hiba a meghívó létrehozásakor: ' + inviteError.message }

  await logAudit(userData.company_id, user.id, 'staff.invite_link', 'invitation', null, null, { email: cleanEmail, role })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  return { inviteUrl }
}

// ============================================================
// Dolgozó profil szerkesztése
// ============================================================
export async function updateStaff(userId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser) return { error: 'Felhasználó nem található.' }

  const isPrivileged = ['owner', 'admin', 'manager'].includes(currentUser.role)

  const positionName = sanitizeNote(formData.get('position'))?.trim() || null

  // Ha új pozíciót adtak meg, elmentjük a positions táblába is (upsert)
  if (positionName && isPrivileged) {
    const { data: existing } = await supabase
      .from('positions')
      .select('id')
      .eq('company_id', currentUser.company_id)
      .ilike('name', positionName)
      .maybeSingle()

    if (!existing) {
      await supabase.from('positions').insert({
        company_id: currentUser.company_id,
        name: positionName,
      })
    }
  }

  const fullName = sanitizeName(formData.get('fullName')) as string

  // Személyes adatok titkosítva frissítése
  const { error: encError } = await updateUserEncrypted(userId, currentUser.company_id, { fullName })
  if (encError) return { error: 'Hiba a profil frissítésekor.' }

  // Nem személyes adatok (position, hourly_rate) direkt frissítése
  const nonPersonalUpdates: Record<string, unknown> = { position: positionName }

  if (isPrivileged) {
    const hourlyRateRaw = formData.get('hourlyRate') as string
    const dailyRateRaw = formData.get('dailyRate') as string
    const payType = formData.get('payType') as string
    nonPersonalUpdates.hourly_rate = hourlyRateRaw ? parseFloat(hourlyRateRaw) : null
    nonPersonalUpdates.daily_rate = dailyRateRaw ? parseFloat(dailyRateRaw) : null
    if (payType === 'hourly' || payType === 'daily') {
      nonPersonalUpdates.pay_type = payType
    }
  }

  // Szerepkör módosítás – csak owner módosíthatja, és csak employee/manager közötti váltás
  if (currentUser.role === 'owner') {
    const newRole = formData.get('role') as string
    if (newRole === 'employee' || newRole === 'manager') {
      // Célfelhasználó nem lehet owner
      const { data: targetUser } = await supabase.from('users').select('role').eq('id', userId).single()
      if (targetUser && targetUser.role !== 'owner') {
        nonPersonalUpdates.role = newRole
      }
    }
  }

  await supabase
    .from('users')
    .update(nonPersonalUpdates)
    .eq('id', userId)
    .eq('company_id', currentUser.company_id)

  revalidatePath('/dashboard/staff')
  revalidatePath('/dashboard/schedule')
  return { success: true }
}

// ============================================================
// Dolgozó deaktiválása
// ============================================================
export async function deactivateStaff(userId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!['owner', 'admin', 'manager'].includes(currentUser?.role ?? '')) {
    return { error: 'Nincs jogosultságod ehhez.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId)
    .eq('company_id', currentUser?.company_id)
    .neq('id', user.id) // Saját magát ne deaktiválhassa

  if (error) return { error: 'Hiba a deaktiválásakor.' }
  await logAudit(currentUser?.company_id!, user.id, 'staff.deactivate', 'user', userId, null, { is_active: false })
  return { success: true }
}

// ============================================================
// Dolgozó visszaaktiválása
// ============================================================
export async function activateStaff(userId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  const { data: currentUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!['owner', 'admin', 'manager'].includes(currentUser?.role ?? '')) {
    return { error: 'Nincs jogosultságod ehhez.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', userId)
    .eq('company_id', currentUser?.company_id)

  if (error) return { error: 'Hiba az aktiválásakor.' }
  await logAudit(currentUser?.company_id!, user.id, 'staff.activate', 'user', userId, null, { is_active: true })
  return { success: true }
}
