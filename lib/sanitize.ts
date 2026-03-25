const HTML_ENTITIES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '&': '&amp;',
}

/**
 * Sanitizes a string by stripping HTML tags and encoding HTML entities.
 * Safe for server-side use without external dependencies.
 */
export function sanitizeText(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'&]/g, (c) => HTML_ENTITIES[c] ?? c)
    .slice(0, maxLength)
}

export function sanitizeTitle(input: unknown): string {
  return sanitizeText(input, 100)
}

export function sanitizeNote(input: unknown): string {
  return sanitizeText(input, 500)
}

export function sanitizeName(input: unknown): string {
  return sanitizeText(input, 100)
}

export function sanitizeContent(input: unknown): string {
  return sanitizeText(input, 2000)
}
