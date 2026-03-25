/**
 * AES-256-GCM titkosítási kulcs rotáció
 *
 * HASZNÁLAT:
 *   OLD_ENCRYPTION_KEY=<régi_kulcs> NEW_ENCRYPTION_KEY=<új_kulcs> \
 *   node --env-file=.env.local scripts/rotate-encryption-key.mjs
 *
 * VAGY standalone:
 *   OLD_ENCRYPTION_KEY=... NEW_ENCRYPTION_KEY=... \
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/rotate-encryption-key.mjs
 *
 * MIKOR KELL FUTTATNI:
 *   - Ha az ENCRYPTION_KEY kompromittálódott
 *   - Évente egyszer preventív kulcscsere
 *
 * FONTOS: Futtatás előtt TEDD MEG:
 *   1. Mentsd el a régi kulcsot biztonságos helyen
 *   2. Generálj új kulcsot: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   3. Tesztelj egy sorral a --dry-run flag-gel
 *   4. Futtasd éles módban
 *   5. Frissítsd az .env.local-t és Vercel-t az új kulccsal
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const OLD_KEY = process.env.OLD_ENCRYPTION_KEY
const NEW_KEY = process.env.NEW_ENCRYPTION_KEY
const DRY_RUN = process.argv.includes('--dry-run')

if (!OLD_KEY || !NEW_KEY) {
  console.error('Hiányzó kulcsok! Szükséges: OLD_ENCRYPTION_KEY és NEW_ENCRYPTION_KEY')
  process.exit(1)
}
if (OLD_KEY === NEW_KEY) {
  console.error('A régi és az új kulcs azonos — nincs mit rotálni.')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Hiányzó SUPABASE konfig!')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const ALGORITHM = 'aes-256-gcm'
const BATCH_SIZE = 50

function decryptWithKey(ciphertext, keyHex) {
  if (!ciphertext || !ciphertext.includes(':')) return ciphertext
  const parts = ciphertext.split(':')
  if (parts.length !== 3) return ciphertext
  const [ivHex, authTagHex, encrypted] = parts
  const key = Buffer.from(keyHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function encryptWithKey(plaintext, keyHex) {
  if (!plaintext) return ''
  const key = Buffer.from(keyHex, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function reEncrypt(ciphertext) {
  if (!ciphertext) return ciphertext
  const plain = decryptWithKey(ciphertext, OLD_KEY)
  return encryptWithKey(plain, NEW_KEY)
}

async function main() {
  console.log(`🔑 Kulcs rotáció ${DRY_RUN ? '[DRY RUN — nem ír semmit]' : '[ÉLES MÓD]'}`)
  console.log(`   Old key: ${OLD_KEY.substring(0, 8)}...`)
  console.log(`   New key: ${NEW_KEY.substring(0, 8)}...\n`)

  // Users tábla
  const { data: users } = await admin
    .from('users')
    .select('id, full_name_encrypted, email_encrypted, phone_encrypted')
    .not('full_name_encrypted', 'is', null)

  console.log(`Users: ${users?.length ?? 0} sor`)

  let usersDone = 0
  for (let i = 0; i < (users?.length ?? 0); i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)
    for (const user of batch) {
      const updates = {
        full_name_encrypted: reEncrypt(user.full_name_encrypted),
        email_encrypted:     reEncrypt(user.email_encrypted),
        phone_encrypted:     user.phone_encrypted ? reEncrypt(user.phone_encrypted) : null,
      }

      if (!DRY_RUN) {
        await admin.from('users').update(updates).eq('id', user.id)
      }
      usersDone++
    }
    console.log(`  Users: ${usersDone}/${users.length} feldolgozva`)
  }

  // Chat history
  const { data: chats } = await admin
    .from('chat_history')
    .select('id, content_encrypted')
    .not('content_encrypted', 'is', null)

  console.log(`\nChat history: ${chats?.length ?? 0} sor`)

  let chatsDone = 0
  for (let i = 0; i < (chats?.length ?? 0); i += BATCH_SIZE) {
    const batch = chats.slice(i, i + BATCH_SIZE)
    for (const chat of batch) {
      if (!DRY_RUN) {
        await admin.from('chat_history')
          .update({ content_encrypted: reEncrypt(chat.content_encrypted) })
          .eq('id', chat.id)
      }
      chatsDone++
    }
  }
  console.log(`  Chat: ${chatsDone}/${chats?.length ?? 0} feldolgozva`)

  console.log('\n══════════════════════════════════════════')
  if (DRY_RUN) {
    console.log('✅ DRY RUN kész — adatok NEM változtak')
    console.log('   Éles futtatáshoz hagyd el a --dry-run flag-et')
  } else {
    console.log('✅ Kulcs rotáció kész!')
    console.log('\n📋 KÖVETKEZŐ LÉPÉS:')
    console.log('   1. Frissítsd .env.local-t: ENCRYPTION_KEY=<új_kulcs>')
    console.log('   2. Frissítsd Vercel Environment Variables-t')
    console.log('   3. Deploy az új kulccsal')
  }
}

main().catch(err => {
  console.error('Hiba:', err)
  process.exit(1)
})
