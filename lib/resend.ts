import { Resend } from 'resend'

// Lazy inicializálás – csak runtime-ban jön létre, build-time nem dob hibát
let _resend: Resend | null = null
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}
