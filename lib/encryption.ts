import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(envVar: string): Buffer {
  const key = process.env[envVar]
  if (!key) throw new Error(`Missing environment variable: ${envVar}`)
  return Buffer.from(key, 'hex')
}

/**
 * AES-256-GCM titkosítás.
 * Formátum: iv:authTag:encryptedData (mind hex)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey('ENCRYPTION_KEY'), iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * AES-256-GCM visszafejtés.
 * Ha a szöveg nem tartalmaz ':' karaktert (legacy plaintext), visszaadja as-is.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''

  // Legacy plaintext adat (migráció előtti) — visszaadja as-is
  if (!ciphertext.includes(':')) return ciphertext

  const parts = ciphertext.split(':')
  if (parts.length !== 3) return ciphertext

  const [ivHex, authTagHex, encrypted] = parts

  try {
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey('ENCRYPTION_KEY'), iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    // Visszafejtési hiba esetén (pl. rossz kulcs) visszaadja az eredeti értéket
    console.error('[encryption] Visszafejtési hiba')
    return ciphertext
  }
}

/**
 * Email hash — egyirányú, kereséshez.
 * Szükséges mert emailre keresni kell (meghívó elfogadás, duplicate check).
 * Case-insensitive: lowercase + trim normalizálás.
 */
export function hashEmail(email: string): string {
  return crypto
    .createHmac('sha256', getKey('EMAIL_HASH_SECRET'))
    .update(email.toLowerCase().trim())
    .digest('hex')
}

/**
 * Pseudonym generálás audit loghoz.
 * Determinisztikus: ugyanaz a userId mindig ugyanazt adja.
 * Nem visszakövethetős: csak PSEUDONYM_SECRET-tel.
 */
export function generatePseudonym(userId: string): string {
  return 'usr_' + crypto
    .createHmac('sha256', getKey('PSEUDONYM_SECRET'))
    .update(userId)
    .digest('hex')
    .substring(0, 12)
}
