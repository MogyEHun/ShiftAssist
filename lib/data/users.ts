/**
 * lib/data/users.ts
 *
 * Centralizált user adatlekérési réteg.
 * Ez az EGYETLEN hely ahol a users táblát személyes adat szempontjából
 * érinteni szabad. Minden más fájlban ezeket a függvényeket kell használni.
 *
 * A visszaadott adatok mindig visszafejtve érkeznek:
 *   full_name, email, phone → plaintext
 *   *_encrypted mezők NEM kerülnek a visszatérési értékbe
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt, decrypt, hashEmail, generatePseudonym } from '@/lib/encryption'
import type { UserRole } from '@/types'

export interface DecryptedUser {
  id: string
  company_id: string
  full_name: string
  email: string
  phone?: string
  role: UserRole
  position: string | null
  hourly_rate: number | null
  daily_rate: number | null
  pay_type: 'hourly' | 'daily'
  is_active: boolean
  birth_date?: string | null
  site_id: string | null
  pseudonym: string
  avatar_url: string | null
  created_at: string
  updated_at: string
  deletion_requested_at?: string | null
}

/** Nyers DB sor visszafejtése DecryptedUser-ré */
function decryptRow(row: Record<string, unknown>): DecryptedUser {
  const fullName = row.full_name_encrypted
    ? decrypt(row.full_name_encrypted as string)
    : ''

  const email = row.email_encrypted
    ? decrypt(row.email_encrypted as string)
    : ''

  const phone = row.phone_encrypted
    ? decrypt(row.phone_encrypted as string)
    : undefined

  // Pseudonym: ha már be van állítva az adatbázisban, használja azt
  // ha nem (migráció előtt), generálja menet közben
  const pseudonym = (row.pseudonym as string | null)
    ?? generatePseudonym(row.id as string)

  return {
    id: row.id as string,
    company_id: row.company_id as string,
    full_name: fullName,
    email,
    phone: phone || undefined,
    role: row.role as UserRole,
    position: (row.position as string | null) ?? null,
    hourly_rate: (row.hourly_rate as number | null) ?? null,
    daily_rate: (row.daily_rate as number | null) ?? null,
    pay_type: ((row.pay_type as string) === 'daily' ? 'daily' : 'hourly') as 'hourly' | 'daily',
    is_active: row.is_active as boolean,
    birth_date: (row.birth_date as string | null) ?? null,
    site_id: (row.site_id as string | null) ?? null,
    pseudonym,
    avatar_url: (row.avatar_url as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    deletion_requested_at: (row.deletion_requested_at as string | null) ?? null,
  }
}

// ─────────────────────────────────────────────────────────────
// Lekérések
// ─────────────────────────────────────────────────────────────

/** Felhasználó lekérése ID alapján */
export async function getUserById(userId: string): Promise<DecryptedUser | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return decryptRow(data as Record<string, unknown>)
}

/** Felhasználó keresése email alapján (meghívó elfogadás, duplicate check) */
export async function getUserByEmailHash(email: string): Promise<DecryptedUser | null> {
  const admin = createAdminClient()
  const hash = hashEmail(email)

  const { data, error } = await admin
    .from('users')
    .select('*')
    .eq('email_hash', hash)
    .maybeSingle()

  if (error || !data) return null
  return decryptRow(data as Record<string, unknown>)
}

/** Összes felhasználó egy cégnél (visszafejtve) */
export async function getCompanyUsers(
  companyId: string,
  activeOnly = false
): Promise<DecryptedUser[]> {
  const admin = createAdminClient()
  let query = admin.from('users').select('*').eq('company_id', companyId)
  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query.order('created_at')

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(decryptRow)
}

// ─────────────────────────────────────────────────────────────
// Írások
// ─────────────────────────────────────────────────────────────

/** Új felhasználó létrehozása titkosított mezőkkel */
export async function createUserEncrypted(params: {
  id: string
  companyId: string
  fullName: string
  email: string
  phone?: string
  role: string
  position?: string | null
  hourlyRate?: number | null
}): Promise<void> {
  const admin = createAdminClient()

  await admin.from('users').upsert({
    id: params.id,
    company_id: params.companyId,
    full_name_encrypted: encrypt(params.fullName),
    email_encrypted: encrypt(params.email),
    phone_encrypted: params.phone ? encrypt(params.phone) : null,
    email_hash: hashEmail(params.email),
    pseudonym: generatePseudonym(params.id),
    role: params.role,
    position: params.position ?? null,
    hourly_rate: params.hourlyRate ?? null,
    is_active: true,
  }, { onConflict: 'id' })
}

/** Személyes adatok frissítése titkosítással */
export async function updateUserEncrypted(
  userId: string,
  companyId: string,
  params: {
    fullName?: string
    phone?: string | null
  }
): Promise<{ error: string | null }> {
  const admin = createAdminClient()

  const updates: Record<string, unknown> = {}

  if (params.fullName !== undefined) {
    updates.full_name_encrypted = encrypt(params.fullName)
  }

  if (params.phone !== undefined) {
    updates.phone_encrypted = params.phone ? encrypt(params.phone) : null
  }

  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .eq('company_id', companyId)

  return { error: error?.message ?? null }
}

/** GDPR törlési jog: személyes adatok anonimizálása (nullázás) */
export async function anonymizeUserData(userId: string): Promise<void> {
  const admin = createAdminClient()

  await admin.from('users').update({
    full_name_encrypted: null,
    email_encrypted: null,
    phone_encrypted: null,
    email_hash: null,
  }).eq('id', userId)

  // Chat history törlése
  await admin.from('chat_history').delete().eq('user_id', userId)
}
