export const APP_NAME = 'MMA Event System'

export const COLORS = {
  primary: '#E63946',
  primaryHover: '#C1121F',
  primaryLight: '#FFCCD5',
  critical: '#DC2626',
  warning: '#F59E0B',
  success: '#22C55E',
  neutral: '#6B7280',
} as const

export const VISA_STATUS_LABELS: Record<number, string> = {
  1: 'Not Required',
  2: 'Required',
  3: 'Applied',
  4: 'Approved',
  5: 'Rejected',
  6: 'Resident',
}

export const VISA_STATUS_COLORS: Record<number, string> = {
  1: 'bg-gray-500',
  2: 'bg-red-500',
  3: 'bg-yellow-500',
  4: 'bg-green-500',
  5: 'bg-red-700',
  6: 'bg-blue-500',
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
