'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { logAudit } from './audit'
import { getUserById, anonymizeUserData } from '@/lib/data/users'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ShiftAssist <noreply@shiftsync.hu>'

// ============================================================
// Fiók törlési kérelem benyújtása (30 napos türelmi idő)
// ============================================================
export async function requestAccountDeletion(confirmedName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  // Visszafejtett profil a titkosítási rétegen keresztül
  const profile = await getUserById(user.id)
  if (!profile) return { error: 'Profil nem található.' }

  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  const companyName = companyData?.name ?? ''

  // Csak owner megerősítheti cégnévvel, egyéb userek saját nevükkel
  const expectedName = profile.role === 'owner' ? companyName : profile.full_name
  if (confirmedName.trim().toLowerCase() !== expectedName.toLowerCase()) {
    return { error: 'A megerősítő név nem egyezik.' }
  }

  const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const admin = createAdminClient()

  // Személyes adatok anonimizálása a törlési kérelem benyújtásakor
  // (extra védelmi réteg: ha a 30 napos azonnali törlés elmaradna)
  await anonymizeUserData(user.id)

  // Törlési dátum mentése
  if (profile.role === 'owner') {
    await admin
      .from('companies')
      .update({ deletion_requested_at: deletionDate } as Record<string, unknown>)
      .eq('id', profile.company_id)
  }

  await admin
    .from('users')
    .update({ deletion_requested_at: deletionDate } as Record<string, unknown>)
    .eq('id', user.id)

  await logAudit(profile.company_id, user.id, 'account.deletion_requested', 'user', user.id, null, { scheduled_for: deletionDate })

  // Email visszaigazolás
  await resend.emails.send({
    from: FROM_EMAIL,
    to: user.email!,
    subject: 'ShiftAssist – Fiók törlési kérelem visszaigazolása',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a5c3a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">ShiftAssist</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #111827; margin-top: 0;">Törlési kérelem visszaigazolva</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Megkaptuk a fiókod törlésére vonatkozó kérelmedet. A törlés <strong>30 nap múlva</strong> fog megtörténni.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Ha meggondoltad magad, lépj be a fiókodba és vonj vissza a kérelmet a Beállítások oldalon.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Ha nem te küldted ezt a kérelmet, kérjük azonnal vedd fel velünk a kapcsolatot:<br>
            <a href="mailto:support@shiftsync.hu" style="color: #1a5c3a;">support@shiftsync.hu</a>
          </p>
        </div>
      </div>
    `,
  })

  return { success: true, deletionDate }
}

// ============================================================
// Törlési kérelem visszavonása
// ============================================================
export async function cancelAccountDeletion() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  const { data: profile } = await supabase
    .from('users')
    .select('id, company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profil nem található.' }

  const admin = createAdminClient()

  await admin
    .from('users')
    .update({ deletion_requested_at: null } as Record<string, unknown>)
    .eq('id', user.id)

  if (profile.role === 'owner') {
    await admin
      .from('companies')
      .update({ deletion_requested_at: null } as Record<string, unknown>)
      .eq('id', profile.company_id)
  }

  await logAudit(profile.company_id, user.id, 'account.deletion_cancelled', 'user', user.id, null, null)
  return { success: true }
}

// ============================================================
// Saját adatok exportálása (GDPR adat-hordozhatóság)
// ============================================================
export async function getMyDataExport() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve.' }

  // Visszafejtett profil (titkosított mezők nélkül)
  const profile = await getUserById(user.id)

  const [shiftsRes, leaveRes, auditRes] = await Promise.all([
    supabase.from('shifts').select('id, start_time, end_time, title, status, break_minutes').eq('user_id', user.id).order('start_time', { ascending: false }).limit(500),
    supabase.from('leave_requests').select('id, type, start_date, end_date, status, reason, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('audit_log').select('action, entity_type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
  ])

  return {
    data: {
      exportedAt: new Date().toISOString(),
      // Csak visszafejtett mezők — *_encrypted, email_hash, pseudonym kihagyva
      profile: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        position: profile.position,
        created_at: profile.created_at,
      } : null,
      shifts: shiftsRes.data ?? [],
      leaveRequests: leaveRes.data ?? [],
      activityLog: auditRes.data ?? [],
    },
    error: null,
  }
}
