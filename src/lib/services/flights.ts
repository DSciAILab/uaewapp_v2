import { createClient } from '@/lib/supabase/client'
import { isFlightType } from '@/types/database'
import type { Flight, FlightType, Enrollment } from '@/types/database'
import type { Database, Tables } from '@/types/supabase'

function getClient() {
  return createClient();
}

/** Exactly the person columns this service selects, straight from the DB types. */
type FlightPerson = Pick<
  Tables<'mma_people'>,
  'id' | 'compiled_name' | 'event_name' | 'appadmin_fighter_id' | 'nationality'
>

type FlightRole = Pick<Tables<'mma_roles'>, 'id' | 'name' | 'code'>

/**
 * Only the enrollment columns this service actually selects — the previous
 * `Enrollment &` claim was never true of the query (it selects 3 columns, not
 * the full row) and was only held up by the `as` cast this replaces.
 */
export interface FlightWithEnrollment extends Flight {
  enrollment: Pick<Enrollment, 'id' | 'event_id'> & {
    event_code: string | null
    person: FlightPerson
    role: FlightRole
  }
}

type FlightRow = Tables<'mma_flights'>

/**
 * mma_flights.type is an open `string` column — narrow it before it enters the
 * domain type. Throwing (rather than defaulting) keeps a corrupt row loud:
 * silently coercing to 'full' would invent a departure leg for an
 * arrival-only passenger, which is exactly the ops failure to avoid.
 */
function toFlight<T extends FlightRow>(row: T): Omit<T, 'type'> & { type: FlightType } {
  if (!isFlightType(row.type)) {
    throw new Error(
      `mma_flights.id=${row.id} has unsupported type "${row.type}" (expected arrival_only | departure_only | full)`
    )
  }
  return { ...row, type: row.type }
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
          appadmin_fighter_id,
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
  let results: FlightWithEnrollment[] = (data || []).map(toFlight)
  
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
  return data ? toFlight(data) : null
}

export async function getFlightByEnrollment(enrollmentId: string): Promise<Flight | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  if (error) throw error
  return data ? toFlight(data) : null
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
          appadmin_fighter_id,
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
  return toFlight(data)
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
  return toFlight(data)
}

export async function updateFlight(id: string, formData: Partial<FlightFormData>): Promise<Flight> {
  // `type` and `status` are NOT NULL columns, so Update types them as
  // `string | undefined` while FlightFormData allows null. Lift them out and
  // re-add only when actually provided, so an explicit null becomes
  // "not provided" instead of a DB-rejected null write.
  const { type, status, ...rest } = formData
  const patch: Database['public']['Tables']['mma_flights']['Update'] = { ...rest }
  if (type != null) patch.type = type
  if (status != null) patch.status = status

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_flights')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return toFlight(data)
}

export async function deleteFlight(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_flights')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getEnrollmentsNeedingFlight(eventId: string) {
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
        appadmin_fighter_id,
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

export interface FlightCSVRow {
  passport_name: string
  flight_type?: string
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
  notes?: string
}

export interface FlightImportError {
  row: number
  name: string
  message: string
}

export async function importFlightsFromCSV(
  eventId: string,
  rows: FlightCSVRow[],
  upsertMode: boolean = true,
  onProgress?: (current: number, total: number, message?: string) => void
): Promise<{ created: number; updated: number; skipped: FlightImportError[]; errors: FlightImportError[] }> {
  const supabase = getClient()
  const errors: FlightImportError[] = []
  const skipped: FlightImportError[] = []
  let created = 0
  let updated = 0
  const total = rows.length

  const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0))

  // 1. Fetch all enrollments for this event with person names
  if (onProgress) onProgress(0, total, 'Buscando participantes do evento...')

  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      person:mma_people(id, compiled_name, event_name),
      needs_flight
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')

  if (enrollError) throw new Error('Failed to fetch enrollments: ' + enrollError.message)

  // Build a name→enrollment map (case insensitive)
  const nameMap = new Map<string, { enrollmentId: string; needsFlight: string }>()
  for (const e of (enrollments || [])) {
    const person = e.person
    if (!person) continue
    const compiledName = (person.compiled_name || '').trim().toLowerCase()
    const eventName = (person.event_name || '').trim().toLowerCase()
    const entry = { enrollmentId: e.id, needsFlight: e.needs_flight || 'none' }
    if (compiledName) nameMap.set(compiledName, entry)
    if (eventName && eventName !== compiledName) nameMap.set(eventName, entry)
  }

  // 2. Fetch existing flights for this event
  if (onProgress) onProgress(0, total, 'Checking existing flights...')

  const enrollmentIds = (enrollments || []).map((e) => e.id)
  const { data: existingFlights } = await supabase
    .from('mma_flights')
    .select('id, enrollment_id')
    .in('enrollment_id', enrollmentIds.length > 0 ? enrollmentIds : ['__none__'])

  const existingFlightMap = new Map<string, string>()
  for (const f of (existingFlights || [])) {
    existingFlightMap.set(f.enrollment_id, f.id)
  }

  // 3. Process each CSV row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    if (onProgress && i % 5 === 0) {
      onProgress(i, total, `Processando linha ${rowNum} de ${total}...`)
      await yieldToUI()
    }

    const passportName = (row.passport_name || '').trim()
    if (!passportName) {
      errors.push({ row: rowNum, name: '(empty)', message: 'Passport name is required' })
      continue
    }

    const match = nameMap.get(passportName.toLowerCase())
    if (!match) {
      skipped.push({ row: rowNum, name: passportName, message: 'Person not found in the event' })
      continue
    }

    const flightType: FlightType = (() => {
      const t = (row.flight_type || '').toLowerCase().trim()
      if (t === 'arrival_only' || t === 'arrival') return 'arrival_only'
      if (t === 'departure_only' || t === 'departure') return 'departure_only'
      return 'full'
    })()

    const flightData: Database['public']['Tables']['mma_flights']['Insert'] = {
      enrollment_id: match.enrollmentId,
      type: flightType,
      arrival_reservation: row.arrival_reservation || null,
      arrival_flight_number: row.arrival_flight_number || null,
      arrival_date: row.arrival_date || null,
      arrival_time: row.arrival_time || null,
      arrival_airport: row.arrival_airport || null,
      arrival_ticket_link: row.arrival_ticket_link || null,
      departure_reservation: row.departure_reservation || null,
      departure_flight_number: row.departure_flight_number || null,
      departure_date: row.departure_date || null,
      departure_time: row.departure_time || null,
      departure_airport: row.departure_airport || null,
      departure_ticket_link: row.departure_ticket_link || null,
      notes: row.notes || null,
      status: 'booked',
    }

    const existingFlightId = existingFlightMap.get(match.enrollmentId)

    if (existingFlightId) {
      if (upsertMode) {
        const { enrollment_id, ...updateData } = flightData
        const { error: updateError } = await supabase
          .from('mma_flights')
          .update(updateData)
          .eq('id', existingFlightId)

        if (updateError) {
          errors.push({ row: rowNum, name: passportName, message: updateError.message })
        } else {
          updated++
        }
      } else {
        skipped.push({ row: rowNum, name: passportName, message: 'Flight already exists (upsert disabled)' })
      }
    } else {
      const { error: insertError } = await supabase
        .from('mma_flights')
        .insert(flightData)

      if (insertError) {
        errors.push({ row: rowNum, name: passportName, message: insertError.message })
      } else {
        created++
        existingFlightMap.set(match.enrollmentId, 'new')
      }
    }
  }

  if (onProgress) onProgress(total, total, 'Done!')
  return { created, updated, skipped, errors }
}
