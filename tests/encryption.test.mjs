/**
 * Titkosítási unit tesztek — Node.js beépített test runner
 *
 * FUTTATÁS (3 kulcs szükséges):
 *   node --env-file=.env.local --test tests/encryption.test.mjs
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// ─── Inline implementáció (nem import, mert .mjs + env) ──────
const ALGORITHM = 'aes-256-gcm'

function getKey(envVar) {
  const key = process.env[envVar]
  if (!key) throw new Error(`Hiányzó env var: ${envVar}`)
  return Buffer.from(key, 'hex')
}

function encrypt(plaintext) {
  if (!plaintext) return ''
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey('ENCRYPTION_KEY'), iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decrypt(ciphertext) {
  if (!ciphertext) return ''
  if (!ciphertext.includes(':')) return ciphertext
  const parts = ciphertext.split(':')
  if (parts.length !== 3) return ciphertext
  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey('ENCRYPTION_KEY'), iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function hashEmail(email) {
  return crypto
    .createHmac('sha256', getKey('EMAIL_HASH_SECRET'))
    .update(email.toLowerCase().trim())
    .digest('hex')
}

function generatePseudonym(userId) {
  return 'usr_' + crypto
    .createHmac('sha256', getKey('PSEUDONYM_SECRET'))
    .update(userId)
    .digest('hex')
    .substring(0, 12)
}

// ─── Tesztek ──────────────────────────────────────────────────

describe('encrypt / decrypt', () => {
  test('körforgás: encrypt → decrypt visszaadja az eredeti szöveget', () => {
    const original = 'Kovács Péter'
    const encrypted = encrypt(original)
    const decrypted = decrypt(encrypted)
    assert.equal(decrypted, original)
  })

  test('titkosított szöveg különbözik az eredetitől', () => {
    const original = 'kovacs@gmail.com'
    const encrypted = encrypt(original)
    assert.notEqual(encrypted, original)
  })

  test('titkosított szöveg tartalmaz iv:authTag:adat struktúrát', () => {
    const encrypted = encrypt('teszt')
    const parts = encrypted.split(':')
    assert.equal(parts.length, 3, 'Pontosan 3 rész kell (iv:authTag:encrypted)')
    assert.equal(parts[0].length, 32, 'IV = 16 bájt = 32 hex karakter')
    assert.equal(parts[1].length, 32, 'AuthTag = 16 bájt = 32 hex karakter')
  })

  test('minden titkosítás egyedi IV-t kap (nem determinisztikus)', () => {
    const text = 'teszt szöveg'
    const enc1 = encrypt(text)
    const enc2 = encrypt(text)
    assert.notEqual(enc1, enc2, 'Két titkosítás sosem lehet azonos (véletlen IV)')
    // De mindkettő visszafejtve azonos
    assert.equal(decrypt(enc1), text)
    assert.equal(decrypt(enc2), text)
  })

  test('üres string encrypt/decrypt', () => {
    assert.equal(encrypt(''), '')
    assert.equal(decrypt(''), '')
  })

  test('legacy plaintext (: nélküli) visszaadja as-is', () => {
    const legacyPlain = 'Kiss Anna'
    assert.equal(decrypt(legacyPlain), legacyPlain)
  })

  test('unicode / magyar ékezetes karakterek', () => {
    const text = 'Árvíztűrő tükörfúrógép — 🇭🇺'
    assert.equal(decrypt(encrypt(text)), text)
  })
})

describe('hashEmail', () => {
  test('konzisztens: ugyanaz az email mindig ugyanazt a hash-t adja', () => {
    const email = 'kovacs.peter@example.com'
    assert.equal(hashEmail(email), hashEmail(email))
  })

  test('case-insensitive normalizálás', () => {
    assert.equal(hashEmail('KOVACS@GMAIL.COM'), hashEmail('kovacs@gmail.com'))
    assert.equal(hashEmail('  kovacs@gmail.com  '), hashEmail('kovacs@gmail.com'))
  })

  test('különböző emailek különböző hash-t adnak', () => {
    assert.notEqual(hashEmail('a@example.com'), hashEmail('b@example.com'))
  })

  test('hex string formátum (64 karakter)', () => {
    const hash = hashEmail('test@test.hu')
    assert.match(hash, /^[0-9a-f]{64}$/)
  })
})

describe('generatePseudonym', () => {
  test('determinisztikus: ugyanaz az ID mindig ugyanazt adja', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    assert.equal(generatePseudonym(id), generatePseudonym(id))
  })

  test('usr_ prefix', () => {
    const pseudo = generatePseudonym('any-user-id')
    assert.ok(pseudo.startsWith('usr_'), `"${pseudo}" nem kezdődik usr_-rel`)
  })

  test('különböző ID-k különböző pseudonymt adnak', () => {
    assert.notEqual(
      generatePseudonym('user-id-1'),
      generatePseudonym('user-id-2')
    )
  })

  test('pseudonym hossza: usr_ + 12 hex = 16 karakter', () => {
    const pseudo = generatePseudonym('test-id')
    assert.equal(pseudo.length, 16)
  })

  test('pseudonym nem tartalmazza az eredeti ID-t', () => {
    const id = 'secret-user-123'
    const pseudo = generatePseudonym(id)
    assert.ok(!pseudo.includes(id), 'Pseudonym nem tartalmazhatja az eredeti ID-t')
  })
})

console.log('\n✅ Titkosítási tesztek futtatása kész.\n')
