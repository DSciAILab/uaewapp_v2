export type UserType = 'admin' | 'staff' | 'temporary'
export type PermissionLevel = 'view' | 'edit'
export type FlightType = 'arrival_only' | 'departure_only' | 'full'
export type TransportNeed = 'none' | 'arrival' | 'departure' | 'both'
export type EnrollmentStatus = 'active' | 'cancelled' | 'replaced'
export type TaskStatus = 'not_required' | 'required' | 'done'
export type TaskType = 'blood_test' | 'photoshoot' | 'video_shoot'
export type BatchStatus = 'scheduled' | 'boarding' | 'departed' | 'arrived'
export type EventStatus = 'planning' | 'active' | 'completed' | 'cancelled'
export type VisaStatus = 1 | 2 | 3 | 4 | 5 | 6 // 1=Not Required, 2=Required, 3=Applied, 4=Approved, 5=Rejected, 6=Resident

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
  fighter_id?: string | null
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

export interface Flight {
  id: string
  enrollment_id: string
  type: FlightType
  arrival_reservation?: string
  arrival_flight_number?: string
  arrival_date?: string
  arrival_time?: string
  arrival_airport?: string
  arrival_ticket_link?: string
  departure_reservation?: string
  departure_flight_number?: string
  departure_date?: string
  departure_time?: string
  departure_airport?: string
  departure_ticket_link?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Visa {
  id: string
  enrollment_id: string
  passport_name?: string
  nationality?: string
  departure_airport?: string
  document_link?: string
  status: VisaStatus
  is_done: boolean
  notes?: string
  created_at: string
  updated_at: string
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
  divergence_approved_by?: string
  divergence_approved_at?: string
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
  fighter_id?: string | null
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
