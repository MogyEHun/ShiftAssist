export const colors = {
  // Brand
  primary: '#1a5c3a',
  primaryHover: '#155033',
  primaryLight: '#e8f5ee',
  secondary: '#d4a017',
  secondaryLight: '#fdf6e3',

  // Neutral
  bg: '#f4f5f7',
  surface: '#ffffff',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Shift status
  shiftPublished: '#1a5c3a',
  shiftUnpublished: '#9ca3af',
  shiftOpen: '#d4a017',
  shiftConflict: '#dc2626',

  // Position colors (published shift cards)
  positions: {
    waiter:    { bg: '#dbeafe', text: '#1d4ed8' },
    bartender: { bg: '#fce7f3', text: '#be185d' },
    chef:      { bg: '#ffedd5', text: '#c2410c' },
    host:      { bg: '#f0fdf4', text: '#15803d' },
    manager:   { bg: '#ede9fe', text: '#7c3aed' },
    security:  { bg: '#f1f5f9', text: '#475569' },
    default:   { bg: '#e5e7eb', text: '#374151' },
  },

  // Status
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#d97706',
  warningLight: '#fef3c7',
  error: '#dc2626',
  errorLight: '#fee2e2',
  info: '#2563eb',
  infoLight: '#dbeafe',
}

export const spacing = {
  navHeight: '56px',
  mobileNavHeight: '64px',
}

export const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.08)',
  panel: '0 4px 16px rgba(0,0,0,0.12)',
  dropdown: '0 8px 24px rgba(0,0,0,0.15)',
}

// Helper: look up position color by a position string (Hungarian or English)
export function getPositionColor(position?: string | null): { bg: string; text: string } {
  const p = (position ?? '').toLowerCase()
  if (p.includes('pincér') || p.includes('waiter'))         return colors.positions.waiter
  if (p.includes('pultos') || p.includes('bartender'))      return colors.positions.bartender
  if (p.includes('séf') || p.includes('chef'))              return colors.positions.chef
  if (p.includes('hostess') || p.includes('host'))          return colors.positions.host
  if (p.includes('vezető') || p.includes('manager'))        return colors.positions.manager
  if (p.includes('biztonsági') || p.includes('security'))   return colors.positions.security
  return colors.positions.default
}
