'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/encryption'
import QRCode from 'qrcode'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const otplib = require('otplib') as {
  authenticator: {
    generateSecret(): string
    keyuri(accountName: string, service: string, secret: string): string
    verify(options: { token: string; secret: string }): boolean
  }
}
const { authenticator } = otplib

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-')
  )
}

export async function get2FAStatus(): Promise<{ enabled: boolean }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { enabled: false }

  const admin = createAdminClient()
  const { data } = await admin
    .from('two_factor_settings')
    .select('is_enabled')
    .eq('user_id', user.id)
    .single()

  return { enabled: data?.is_enabled ?? false }
}

export async function setup2FA(): Promise<{ qrCodeUrl?: string; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nincs bejelentkezve' }

  const secret = authenticator.generateSecret()
  const otpauth = authenticator.keyuri(user.email ?? user.id, 'ShiftAssist', secret)
  const qrCodeUrl = await QRCode.toDataURL(otpauth)

  const admin = createAdminClient()
  const backupCodes = generateBackupCodes()

  await admin.from('two_factor_settings').upsert({
    user_id: user.id,
    secret_encrypted: encrypt(secret),
    backup_codes_encrypted: encrypt(JSON.stringify(backupCodes)),
    is_enabled: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return { qrCodeUrl }
}

export async function confirmSetup2FA(
  token: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }

  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('two_factor_settings')
    .select('secret_encrypted, backup_codes_encrypted')
    .eq('user_id', user.id)
    .single()

  if (!settings) return { success: false, error: 'Nincs megkezdett 2FA beállítás' }

  const secret = decrypt(settings.secret_encrypted)
  const isValid = authenticator.verify({ token: token.replace(/\s/g, ''), secret })
  if (!isValid) return { success: false, error: 'Érvénytelen kód. Ellenőrizd az authenticator alkalmazásodat.' }

  await admin
    .from('two_factor_settings')
    .update({ is_enabled: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  const backupCodes = JSON.parse(decrypt(settings.backup_codes_encrypted)) as string[]
  return { success: true, backupCodes }
}

export async function disable2FA(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }

  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('two_factor_settings')
    .select('secret_encrypted, is_enabled')
    .eq('user_id', user.id)
    .single()

  if (!settings?.is_enabled) return { success: false, error: 'A 2FA nincs engedélyezve' }

  const secret = decrypt(settings.secret_encrypted)
  const isValid = authenticator.verify({ token: token.replace(/\s/g, ''), secret })
  if (!isValid) return { success: false, error: 'Érvénytelen kód' }

  await admin.from('two_factor_settings').delete().eq('user_id', user.id)
  return { success: true }
}

export async function verify2FALogin(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nincs bejelentkezve' }

  const cookieStore = cookies()
  const tfaUserId = cookieStore.get('tfa_required')?.value
  if (tfaUserId !== user.id) return { success: false, error: 'Érvénytelen munkamenet' }

  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('two_factor_settings')
    .select('secret_encrypted, backup_codes_encrypted')
    .eq('user_id', user.id)
    .eq('is_enabled', true)
    .single()

  if (!settings) return { success: false, error: 'Nincs aktív 2FA beállítás' }

  const secret = decrypt(settings.secret_encrypted)
  let isValid = authenticator.verify({ token: token.replace(/\s/g, ''), secret })

  // Backup kód próba, ha TOTP nem stimmel
  if (!isValid) {
    const backupCodes = JSON.parse(decrypt(settings.backup_codes_encrypted)) as string[]
    const normalized = token.trim().toUpperCase()
    const codeIndex = backupCodes.findIndex(c => c === normalized)
    if (codeIndex !== -1) {
      backupCodes.splice(codeIndex, 1)
      await admin
        .from('two_factor_settings')
        .update({ backup_codes_encrypted: encrypt(JSON.stringify(backupCodes)) })
        .eq('user_id', user.id)
      isValid = true
    }
  }

  if (!isValid) return { success: false, error: 'Érvénytelen kód. Próbáld újra.' }

  cookieStore.delete('tfa_required')

  // Szerepkör alapú átirányítás
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role === 'super_admin') redirect('/admin')
  if (role === 'employee') redirect('/my')
  redirect('/dashboard')
}
