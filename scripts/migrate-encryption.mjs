/**
 * Meglévő user adatok titkosítása (egyszeri migráció)
 *
 * FUTTATÁS (az .env.local kulcsok betöltése után):
 *   node --env-file=.env.local scripts/migrate-encryption.mjs
 *
 * IDEMPOTENS: Ha full_name_encrypted már ki van töltve, kihagyja azt a sort.
 *
 * MIGRÁCIÓ UTÁNI ELLENŐRZÉS (Supabase SQL Editor):
 *   SELECT COUNT(*) FROM users WHERE full_name_encrypted IS NULL;
 *   -- Ha 0 → biztonságos a régi oszlopok törlése:
 *   ALTER TABLE users DROP COLUMN IF EXISTS full_name;
 *   ALTER TABLE users DROP COLUMN IF EXISTS email;
 *   ALTER TABLE users DROP COLUMN IF EXISTS phone;
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// ─── Kulcsok és konfig ────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const EMAIL_HASH_SECRET = process.env.EMAIL_HASH_SECRET
const PSEUDONYM_SECRET = process.env.PSEUDONYM_SECRET

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ENCRYPTION_KEY || !EMAIL_HASH_SECRET || !PSEUDONYM_SECRET) {
  console.error('Hiányzó environment variable!')
  console.error('Futtasd: node --env-file=.env.local scripts/migrate-encryption.mjs')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Titkosítási függvények (inline, nem import mert .mjs) ────
const ALGORITHM = 'aes-256-gcm'
const encKey = Buffer.from(ENCRYPTION_KEY, 'hex')
const hashKey = Buffer.from(EMAIL_HASH_SECRET, 'hex')
const pseudoKey = Buffer.from(PSEUDONYM_SECRET, 'hex')

function encrypt(plaintext) {
  if (!plaintext) return ''
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, encKey, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function hashEmail(email) {
  return crypto.createHmac('sha256', hashKey)
    .update(email.toLowerCase().trim())
    .digest('hex')
}

function generatePseudonym(userId) {
  return 'usr_' + crypto.createHmac('sha256', pseudoKey)
    .update(userId)
    .digest('hex')
    .substring(0, 12)
}

// ─── Migráció ─────────────────────────────────────────────────
const BATCH_SIZE = 50

async function main() {
  console.log('ShiftSync — Titkosítási migráció indítása...\n')

  // Összes user lekérése (akiknek még nincs titkosítva)
  const { data: users, error } = await admin
    .from('users')
    .select('id, full_name, email, phone, full_name_encrypted')
    .is('full_name_encrypted', null)

  if (error) {
    console.error('Lekérési hiba:', error.message)
    process.exit(1)
  }

  if (!users || users.length === 0) {
    console.log('✅ Nincs migrálásra váró user — minden adat már titkosítva van.')
    return
  }

  console.log(`📋 Migrálásra vár: ${users.length} user`)
  console.log(`🔄 Batch méret: ${BATCH_SIZE}\n`)

  let migrated = 0
  let failed = 0

  // Batch feldolgozás
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(users.length / BATCH_SIZE)

    console.log(`Batch ${batchNum}/${totalBatches} feldolgozása (${batch.length} user)...`)

    for (const user of batch) {
      try {
        const updates = {
          full_name_encrypted: encrypt(user.full_name ?? ''),
          email_encrypted:     encrypt(user.email ?? ''),
          phone_encrypted:     user.phone ? encrypt(user.phone) : null,
          email_hash:          user.email ? hashEmail(user.email) : null,
          pseudonym:           generatePseudonym(user.id),
        }

        const { error: updateError } = await admin
          .from('users')
          .update(updates)
          .eq('id', user.id)

        if (updateError) {
          console.error(`  ✗ ${user.id}: ${updateError.message}`)
          failed++
        } else {
          migrated++
        }
      } catch (err) {
        console.error(`  ✗ ${user.id}: ${err.message}`)
        failed++
      }
    }

    console.log(`  → ${migrated} migrálva eddig, ${failed} hiba\n`)
  }

  // chat_history migráció
  console.log('🔄 Chat history titkosítása...')
  const { data: chats } = await admin
    .from('chat_history')
    .select('id, content')
    .is('content_encrypted', null)

  if (chats && chats.length > 0) {
    console.log(`  Migrálásra vár: ${chats.length} chat üzenet`)
    for (let i = 0; i < chats.length; i += BATCH_SIZE) {
      const batch = chats.slice(i, i + BATCH_SIZE)
      for (const chat of batch) {
        if (!chat.content) continue
        await admin
          .from('chat_history')
          .update({ content_encrypted: encrypt(chat.content) })
          .eq('id', chat.id)
      }
    }
    console.log('  ✅ Chat history titkosítva\n')
  } else {
    console.log('  ✅ Nincs migrálásra váró chat üzenet\n')
  }

  // Eredmény
  console.log('══════════════════════════════════════════')
  console.log(`✅ Migráció kész!`)
  console.log(`   Sikeresen migrált user: ${migrated}`)
  console.log(`   Hibás:                  ${failed}`)
  console.log('══════════════════════════════════════════')
  console.log('\n📋 KÖVETKEZŐ LÉPÉS (Supabase SQL Editor):')
  console.log('   SELECT COUNT(*) FROM users WHERE full_name_encrypted IS NULL;')
  console.log('   -- Ha 0, futtasd:')
  console.log('   ALTER TABLE users DROP COLUMN IF EXISTS full_name;')
  console.log('   ALTER TABLE users DROP COLUMN IF EXISTS email;')
  console.log('   ALTER TABLE users DROP COLUMN IF EXISTS phone;')
}

main().catch(err => {
  console.error('Váratlan hiba:', err)
  process.exit(1)
})
