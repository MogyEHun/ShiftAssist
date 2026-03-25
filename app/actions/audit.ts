'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { AuditLog } from '@/types'
import { generatePseudonym, decrypt } from '@/lib/encryption'

// ------------------------------------------------------------
// Audit esemény logolása (server action-ökből hívandó)
// ------------------------------------------------------------
export async function logAudit(
  companyId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null
): Promise<void> {
  try {
    const admin = createAdminClient()
    const record: Record<string, unknown> = {
      company_id: companyId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
    }
    try {
      record.user_pseudonym = generatePseudonym(userId)
    } catch { /* encryption kulcs hiány esetén kihagyjuk */ }

    const { error } = await admin.from('audit_log').insert(record)
    if (error) {
      // Ha user_pseudonym oszlop nem létezik, próbáljuk anélkül
      if (error.message?.includes('user_pseudonym')) {
        delete record.user_pseudonym
        await admin.from('audit_log').insert(record)
      } else {
        console.error('[audit] insert hiba:', error.message, action)
      }
    }
  } catch (err) {
    console.error('[audit] logolási hiba:', action, err)
  }
}

// ------------------------------------------------------------
// Audit napló lekérdezése (vezető nézet – saját cég)
// ------------------------------------------------------------
const SCHEDULE_ACTIONS = ['shift.create', 'shift.update', 'shift.delete', 'shift.move', 'swap.resolved', 'open_shift.create', 'open_shift.claimed']

export async function getActivityLog(limit = 200, scheduleOnly = false): Promise<AuditLog[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) return []

  const admin = createAdminClient()

  // audit_log lekérés felhasználói adatok nélkül (FK JOIN problémák elkerülése)
  let query = admin
    .from('audit_log')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (scheduleOnly) {
    query = query.in('action', SCHEDULE_ACTIONS)
  }

  const { data, error: logError } = await query
  if (logError) {
    console.error('[audit] getActivityLog hiba:', logError.message)
    return []
  }

  // user_id-k alapján dekriptált felhasználói adatok lekérése
  const userIds = Array.from(new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean)))
  let userMap: Record<string, { id: string; full_name: string; email: string; role: string }> = {}

  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, full_name_encrypted, email_encrypted, role')
      .in('id', userIds)

    for (const u of users ?? []) {
      userMap[u.id] = {
        id: u.id,
        role: u.role,
        full_name: u.full_name_encrypted ? decrypt(u.full_name_encrypted) : '',
        email: u.email_encrypted ? decrypt(u.email_encrypted) : '',
      }
    }
  }

  const decrypted = (data ?? []).map((entry: any) => ({
    ...entry,
    user: entry.user_id ? (userMap[entry.user_id] ?? null) : null,
  }))

  return decrypted as AuditLog[]
}

// ------------------------------------------------------------
// Legutóbbi műszak-törlés visszavonása (10 percen belül)
// ------------------------------------------------------------
export async function undoLastShiftDelete(auditLogId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod' }
  }

  const admin = createAdminClient()
  const { data: logEntry } = await admin
    .from('audit_log')
    .select('*')
    .eq('id', auditLogId)
    .eq('company_id', profile.company_id)
    .eq('action', 'shift.delete')
    .single()

  if (!logEntry) return { success: false, error: 'Bejegyzés nem található' }

  // 10 percen belüli?
  const loggedAt = new Date(logEntry.created_at).getTime()
  const now = Date.now()
  if (now - loggedAt > 10 * 60 * 1000) {
    return { success: false, error: 'A visszavonási idő (10 perc) lejárt' }
  }

  const shiftData = logEntry.old_value
  if (!shiftData) return { success: false, error: 'Nincs visszaállítható adat' }

  const { error } = await admin.from('shifts').insert({
    ...shiftData,
    id: undefined, // új ID kap
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (error) return { success: false, error: 'Visszaállítás sikertelen' }

  return { success: true }
}
