'use client'

/**
 * Adatvédelmi UI komponensek — érzékeny adatok maszkolásához
 */

// ─────────────────────────────────────────────────────────────
// Órabér: csak manager/owner látja, egyébként maszkolva
// ─────────────────────────────────────────────────────────────
interface MaskedHourlyRateProps {
  rate: number | null
  userRole: string
  className?: string
}

export function MaskedHourlyRate({ rate, userRole, className }: MaskedHourlyRateProps) {
  const canSee = ['owner', 'admin', 'manager'].includes(userRole)

  if (!canSee) {
    return <span className={`text-gray-400 select-none ${className ?? ''}`} title="Nincs jogosultságod látni">••••</span>
  }

  if (rate === null || rate === undefined) {
    return <span className={`text-gray-400 ${className ?? ''}`}>—</span>
  }

  return (
    <span className={className}>
      {rate.toLocaleString('hu-HU')} Ft/h
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Email: listanézetben maszkolva, hover/title-ben teljes
// ─────────────────────────────────────────────────────────────
interface MaskedEmailProps {
  email: string
  className?: string
}

export function MaskedEmail({ email, className }: MaskedEmailProps) {
  if (!email || !email.includes('@')) {
    return <span className={`text-gray-400 ${className ?? ''}`}>—</span>
  }

  const [local, domain] = email.split('@')
  const masked = local.substring(0, 2) + '***@' + domain

  return (
    <span
      className={`cursor-help ${className ?? ''}`}
      title={email}
    >
      {masked}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Telefon: maszkolva, csak az utolsó 4 szám látható
// ─────────────────────────────────────────────────────────────
interface MaskedPhoneProps {
  phone: string | null
  className?: string
}

export function MaskedPhone({ phone, className }: MaskedPhoneProps) {
  if (!phone) {
    return <span className={`text-gray-400 ${className ?? ''}`}>—</span>
  }

  const digits = phone.replace(/\D/g, '')
  const masked = '•'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4)

  return (
    <span className={`cursor-help ${className ?? ''}`} title={phone}>
      {masked}
    </span>
  )
}
