/**
 * lib/audit.ts
 *
 * Centralizált audit logging wrapper.
 * Pseudonymot generál a user_id-ből és hash-eli az IP-t.
 * Használd ezt az app/actions/audit.ts logAudit() helyett ha IP-t is naplózni kell.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { generatePseudonym, hashEmail } from '@/lib/encryption'
import { createClient } from '@/lib/supabase/server'

export interface AuditEventParams {
  userId: string
  action: string
  entityType: string
  entityId?: string | null
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', params.userId)
      .single()

    if (!profile?.company_id) return

    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      company_id: profile.company_id,
      user_id: params.userId,
      user_pseudonym: generatePseudonym(params.userId),
      ip_hash: params.ipAddress ? hashEmail(params.ipAddress) : null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
    })
  } catch {
    console.error('[audit] logAuditEvent hiba:', params.action)
  }
}
