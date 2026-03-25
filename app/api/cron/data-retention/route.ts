import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ShiftAssist <noreply@shiftsync.hu>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://shiftsync.hu'

export async function GET(request: NextRequest) {
  // Vercel Cron hitelesítés (Authorization: Bearer CRON_SECRET)
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const results: Record<string, unknown> = {}

  // 1. chat_history > 90 nap törlése
  const chatCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { error: chatErr, count: chatCount } = await admin
    .from('chat_history')
    .delete({ count: 'exact' })
    .lt('created_at', chatCutoff)
  results.chat_history_deleted = chatErr ? `ERROR: ${chatErr.message}` : chatCount

  // 2. audit_log > 1 év törlése
  const auditCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
  const { error: auditErr, count: auditCount } = await admin
    .from('audit_log')
    .delete({ count: 'exact' })
    .lt('created_at', auditCutoff)
  results.audit_log_deleted = auditErr ? `ERROR: ${auditErr.message}` : auditCount

  // 3. Trial emlékeztetők küldése (7, 3, 1 nap előtt)
  const REMINDER_DAYS = [7, 3, 1]
  let remindersSent = 0

  for (const daysLeft of REMINDER_DAYS) {
    const reminderDate = new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000)
    const dateStart = new Date(reminderDate)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(reminderDate)
    dateEnd.setHours(23, 59, 59, 999)

    const { data: expiringCompanies } = await admin
      .from('companies')
      .select('id, name, trial_ends_at, users!inner(id, email_encrypted, full_name_encrypted, role)')
      .eq('subscription_status', 'trialing')
      .gte('trial_ends_at', dateStart.toISOString())
      .lte('trial_ends_at', dateEnd.toISOString())

    for (const company of expiringCompanies ?? []) {
      const users = company.users as unknown as { id: string; email_encrypted: string; full_name_encrypted: string; role: string }[]
      const ownerRaw = users.find((u) => u.role === 'owner')
      if (!ownerRaw) continue
      const { decrypt } = await import('@/lib/encryption')
      const owner = {
        email: ownerRaw.email_encrypted ? decrypt(ownerRaw.email_encrypted) : '',
        full_name: ownerRaw.full_name_encrypted ? decrypt(ownerRaw.full_name_encrypted) : '',
      }
      if (!owner.email) continue

      await resend.emails.send({
        from: FROM_EMAIL,
        to: owner.email,
        subject: `ShiftAssist – A próbaidőszakod ${daysLeft} nap múlva lejár`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a5c3a; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">ShiftAssist</h1>
            </div>
            <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #111827; margin-top: 0;">A próbaidőszak hamarosan lejár</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Kedves ${owner.full_name},<br><br>
                A <strong>${company.name}</strong> ShiftAssist próbaidőszaka <strong>${daysLeft} nap múlva lejár</strong>.
              </p>
              <p style="color: #4b5563; line-height: 1.6;">
                A hozzáférés fenntartásához válassz előfizetési csomagot a Számlázás oldalon.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${APP_URL}/dashboard/billing"
                   style="background: #1a5c3a; color: white; padding: 14px 32px; border-radius: 8px;
                          text-decoration: none; font-weight: bold; display: inline-block;">
                  Előfizetés aktiválása
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px;">
                Kérdéseid vannak? Írj nekünk:
                <a href="mailto:support@shiftsync.hu" style="color: #1a5c3a;">support@shiftsync.hu</a>
              </p>
            </div>
          </div>
        `,
      }).catch(() => null) // Sikertelen email ne blokkolja a többit

      remindersSent++
    }
  }
  results.trial_reminders_sent = remindersSent

  // 4. Lejárt törlési kérelmek végrehajtása (30 nap után)
  const { data: usersToDelete } = await admin
    .from('users')
    .select('id, company_id, role')
    .lt('deletion_requested_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .not('deletion_requested_at', 'is', null)

  let deletedAccounts = 0
  for (const u of usersToDelete ?? []) {
    // Soft delete: titkosított személyes adatok nullázása, is_active = false
    await admin.from('users').update({
      full_name_encrypted: null,
      email_encrypted: null,
      phone_encrypted: null,
      email_hash: null,
      is_active: false,
      deletion_requested_at: null,
    }).eq('id', u.id)
    deletedAccounts++
  }
  results.accounts_deleted = deletedAccounts

  return NextResponse.json({ ok: true, timestamp: now.toISOString(), results })
}
