// @ts-nocheck
import { createClient } from '@/lib/supabase/client'
import type { Flight, FlightType, Enrollment } from '@/types/database'

function getClient() {
  return createClient();
}

export interface FlightWithEnrollment extends Flight {
  enrollment: Enrollment & {
    person: {
      id: string
      compiled_name: string
      event_name: string | null
      fighter_id: number | null
      nationality: string | null
    }
    role: {
      id: string
      name: string
      code: string
    }
    event_code: string
  }
}

export interface FlightFilters {
  eventId?: string
  status?: string
  type?: FlightType
  arrivalDate?: string
  departureDate?: string
  search?: string
}

export async function getFlightsByEvent(eventId: string, filters: FlightFilters = {}): Promise<FlightWithEnrollment[]> {
  const supabase = getClient();
  let query = supabase
    .from('mma_flights')
    .select(`
      *,
      enrollment:mma_enrollments!inner(
        id,
        event_id,
        event_code,
        person:mma_people(
          id,
          compiled_name,
          event_name,
          fighter_id,
          nationality
        ),
        role:mma_roles(
          id,
          name,
          code
        )
      )
    `)
    .eq('enrollment.event_id', eventId)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.arrivalDate) {
    query = query.eq('arrival_date', filters.arrivalDate)
  }

  if (filters.departureDate) {
    query = query.eq('departure_date', filters.departureDate)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  
  // Client-side search filtering since nested filters don't work well
  let results = (data || []) as FlightWithEnrollment[]
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    results = results.filter(f => 
      f.enrollment?.person?.compiled_name?.toLowerCase().includes(searchLower) ||
      f.enrollment?.event_code?.toLowerCase().includes(searchLower) ||
      f.arrival_flight_number?.toLowerCase().includes(searchLower) ||
      f.departure_flight_number?.toLowerCase().includes(searchLower)
    )
  }
  
  return results
}

export async function getFlightByEventCode(eventId: string, code: string): Promise<Flight | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .select(`
      *,
      enrollment:mma_enrollments!inner(
        id,
        event_id,
        event_code
      )
    `)
    .eq('enrollment.event_id', eventId)
    .ilike('enrollment.event_code', code)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getFlightByEnrollment(enrollmentId: string): Promise<Flight | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getFlightById(id: string): Promise<FlightWithEnrollment | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .select(`
      *,
      enrollment:mma_enrollments(
        id,
        event_id,
        event_code,
        person:mma_people(
          id,
          compiled_name,
          event_name,
          fighter_id,
          nationality
        ),
        role:mma_roles(
          id,
          name,
          code
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FlightWithEnrollment
}

export interface FlightFormData {
  enrollment_id: string
  type: FlightType
  arrival_reservation?: string | null
  arrival_flight_number?: string | null
  arrival_date?: string | null
  arrival_time?: string | null
  arrival_airport?: string | null
  arrival_ticket_link?: string | null
  departure_reservation?: string | null
  departure_flight_number?: string | null
  departure_date?: string | null
  departure_time?: string | null
  departure_airport?: string | null
  departure_ticket_link?: string | null
  status?: string | null
  notes?: string | null
}

export async function createFlight(formData: FlightFormData): Promise<Flight> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .insert({
      ...formData,
      status: formData.status || 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFlight(id: string, formData: Partial<FlightFormData>): Promise<Flight> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFlight(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_flights')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getEnrollmentsNeedingFlight(eventId: string): Promise<any[]> {
  const supabase = getClient();
  // Get enrollments that need flight but don't have one yet
  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      event_code,
      needs_flight,
      person:mma_people(
        id,
        compiled_name,
        event_name,
        fighter_id,
        nationality
      ),
      role:mma_roles(
        id,
        name,
        code
      )
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .neq('needs_flight', 'none')

  if (enrollError) throw enrollError

  // Get existing flights for this event
  const { data: flights, error: flightError } = await supabase
    .from('mma_flights')
    .select('enrollment_id')
    .in('enrollment_id', enrollments?.map(e => e.id) || [])

  if (flightError) throw flightError

  const existingFlightEnrollmentIds = new Set(flights?.map(f => f.enrollment_id) || [])

  // Filter enrollments without flights
  return (enrollments || []).filter(e => !existingFlightEnrollmentIds.has(e.id))
}

export async function getFlightStats(eventId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .select(`
      id,
      status,
      type,
      enrollment:mma_enrollments!inner(event_id)
    `)
    .eq('enrollment.event_id', eventId)

  if (error) throw error

  const flights = data || []
  
  return {
    total: flights.length,
    pending: flights.filter(f => f.status === 'pending').length,
    booked: flights.filter(f => f.status === 'booked').length,
    confirmed: flights.filter(f => f.status === 'confirmed').length,
    cancelled: flights.filter(f => f.status === 'cancelled').length,
    arrivalOnly: flights.filter(f => f.type === 'arrival_only').length,
    departureOnly: flights.filter(f => f.type === 'departure_only').length,
    fullTrip: flights.filter(f => f.type === 'full').length,
  }
}
