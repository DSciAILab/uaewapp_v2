import type { Tables } from '@/types/supabase'

export type UserType = 'admin' | 'staff' | 'temporary'
export type PermissionLevel = 'view' | 'edit'
export type FlightType = 'arrival_only' | 'departure_only' | 'full'

/**
 * mma_flights.type is an open `string` in the DB (no CHECK/enum backing it),
 * so a row can legally hold a value outside FlightType. Narrow at every read
 * boundary instead of asserting.
 */
export const FLIGHT_TYPES = ['arrival_only', 'departure_only', 'full'] as const

export function isFlightType(s: string): s is FlightType {
  return (FLIGHT_TYPES as readonly string[]).includes(s)
}
export type TransportNeed = 'none' | 'arrival' | 'departure' | 'both'
export type EnrollmentStatus = 'active' | 'cancelled' | 'replaced'
export type TaskStatus = 'not_required' | 'required' | 'done'
export type TaskType = 'blood_test' | 'photoshoot' | 'video_shoot'
export type BatchStatus = 'scheduled' | 'boarding' | 'departed' | 'arrived'
export type EventStatus = 'planning' | 'active' | 'completed' | 'cancelled'
export type VisaStatus = 1 | 2 | 3 | 4 | 5 | 6 // 1=Not Required, 2=Required, 3=Applied, 4=Approved, 5=Rejected, 6=Resident

/**
 * mma_visas.status is an open `number` in the DB (no CHECK/enum backing it),
 * so a row can legally hold a value outside VisaStatus. Narrow at every read
 * boundary instead of asserting.
 */
export const VISA_STATUSES = [1, 2, 3, 4, 5, 6] as const

export function isVisaStatus(n: number): n is VisaStatus {
  return (VISA_STATUSES as readonly number[]).includes(n)
}

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  user_type: UserType
  is_active: boolean
  expires_at?: string
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface Person {
  id: string
  name: string
  surname?: string | null
  compiled_name: string
  event_name?: string
  appadmin_fighter_id?: string | null
  gender?: string
  phone?: string
  dob?: string
  nationality?: string
  passport_number?: string
  passport_expiry?: string
  passport_photo?: string
  document_folder?: string
  height?: number
  reach?: number
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  code?: string
  event_date: string
  event_end_date?: string
  city?: string
  country?: string
  venue?: string
  main_airport?: string
  checkin_margin_hours: number
  checkout_margin_hours: number
  status: EventStatus
  fight_card_csv_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  code: string
  parent_id?: string
  is_base: boolean
  is_active: boolean
}

export interface Enrollment {
  id: string
  event_id: string
  person_id: string
  role_id: string
  event_code: string
  event_code_seq: number
  needs_flight: FlightType | 'none'
  needs_visa: boolean
  needs_hotel: boolean
  needs_transport: TransportNeed
  corner: string | null
  status: EnrollmentStatus
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
  // Joins
  person?: Person
  role?: Role
  event?: Event
}

/**
 * Derived from the generated row type so nullability always tracks the DB.
 * `type` is re-narrowed to FlightType: the column is an open string, so reads
 * must go through isFlightType() before producing a Flight.
 */
export type Flight = Omit<Tables<'mma_flights'>, 'type'> & {
  type: FlightType
}

/**
 * Derived from the generated row type so nullability always tracks the DB
 * (passport_name / nationality / departure_airport / document_link / notes are
 * all `string | null`, not the optional `string` this used to claim).
 * `status` is re-narrowed to VisaStatus via isVisaStatus() at read boundaries.
 */
export type Visa = Omit<Tables<'mma_visas'>, 'status'> & {
  status: VisaStatus
}

export interface Hotel {
  id: string
  enrollment_id: string
  suggested_checkin_date?: string
  suggested_checkin_time?: string
  suggested_checkout_date?: string
  suggested_checkout_time?: string
  reservation_number?: string
  checkin_date?: string
  checkin_time?: string
  checkout_date?: string
  checkout_time?: string
  has_divergence: boolean
  divergence_type?: string[]
  divergence_approved?: boolean
  divergence_divergence_approved_by?: string
  divergence_divergence_approved_at?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface TransportDriver {
  id: string
  name: string
  phone: string
  notes?: string
  is_active: boolean
  created_at: string
}

export interface TransportCar {
  id: string
  event_id: string
  car_number: number
  type: 'arrival' | 'departure' | 'event'
  vehicle_type?: string
  driver_id?: string
  flight_number?: string
  flight_date?: string
  flight_time?: string
  airport?: string
  scheduled_date?: string
  scheduled_time?: string
  status: string
  notes?: string
  created_at: string
  // Joins
  driver?: TransportDriver
}

export interface PermissionArea {
  id: string
  code: string
  name: string
  display_order: number
}

export interface UserPermission {
  id: string
  user_id: string
  area_id: string
  permission: PermissionLevel
  area?: PermissionArea
}

// Filtros e paginação
export interface PeopleFilters {
  search?: string
  nationality?: string
  hasPassport?: boolean
  /** Restrict to these person ids (e.g. people enrolled in the active event). */
  personIds?: string[]
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Form types
export interface PersonFormData {
  name: string
  surname?: string | null
  event_name?: string | null
  appadmin_fighter_id?: string | null
  gender?: string | null
  phone?: string | null
  dob?: string | null
  nationality?: string | null
  passport_number?: string | null
  passport_expiry?: string | null
  passport_photo?: string | null
  document_folder?: string | null
  height?: number | null
  reach?: number | null
}

// CSV Import
export interface CSVMapping {
  csvColumn: string
  dbField: keyof PersonFormData | 'skip'
}

export interface CSVPreviewRow {
  [key: string]: string
}
