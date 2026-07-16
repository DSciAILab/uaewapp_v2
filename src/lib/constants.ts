export const APP_NAME = 'MMA Event System'

export const VISA_STATUS_LABELS: Record<number, string> = {
  1: 'Not Required',
  2: 'Required',
  3: 'Applied',
  4: 'Approved',
  5: 'Rejected',
  6: 'Resident',
}

export type DSStatus = 'pending' | 'confirmed' | 'warning' | 'critical' | 'neutral'

/**
 * Visa status -> DS semantics, rendered by StatusBadge.
 *
 * These used to be raw `bg-*-500` classes, which carried their own palette and
 * ignored the design tokens (a visa "Required" was the same red as a hard
 * failure). Mapping onto the five locked semantics instead: Required is an
 * action still owed (pending), Applied is in flight (warning), Rejected is the
 * only genuine failure (critical), and Resident is as good as Approved.
 */
export const VISA_STATUS_COLORS: Record<number, DSStatus> = {
  1: 'neutral', // Not Required
  2: 'pending', // Required
  3: 'warning', // Applied
  4: 'confirmed', // Approved
  5: 'critical', // Rejected
  6: 'confirmed', // Resident
}

export const ROLE_CODES = {
  FIGHTER: 'F',
  CORNER: 'C',
  GUEST: 'G',
  STAFF: 'ST',
} as const

export const PERMISSION_AREAS = [
  'people',
  'events',
  'flights',
  'visas',
  'hotels',
  'transport',
  'operations',
  'pre_event',
  'admin',
] as const

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Eventos', href: '/events', icon: 'Calendar', area: 'events' },
  { label: 'People', href: '/people', icon: 'Users', area: 'people' },
  { label: 'Aéreo', href: '/flights', icon: 'Plane', area: 'flights' },
  { label: 'Vistos', href: '/visas', icon: 'FileText', area: 'visas' },
  { label: 'Hotel', href: '/hotels', icon: 'Building2', area: 'hotels' },
  { label: 'Transporte', href: '/transport', icon: 'Car', area: 'transport' },
  { label: 'Configurações', href: '/settings', icon: 'Settings', area: 'admin' },
] as const
