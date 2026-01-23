import { createClient } from '@/lib/supabase/client'
import type { Enrollment, Role, Person, TransportNeed, FlightType } from '@/types/database'

const supabase = createClient()

export interface EnrollmentWithDetails extends Enrollment {
  person: Person
  role: Role
}

export interface EnrollmentFormData {
  event_id: string
  person_id: string
  role_id: string
  needs_flight?: FlightType | 'none'
  needs_visa?: boolean
  needs_hotel?: boolean
  needs_transport?: TransportNeed
}

export async function getEnrollmentsByEvent(eventId: string): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .select(`
      *,
      person:mma_people(*),
      role:mma_roles(*)
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .order('event_code_seq', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .select(`
      *,
      person:mma_people(*),
      role:mma_roles(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createEnrollment(formData: EnrollmentFormData): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .insert({
      ...formData,
      needs_flight: formData.needs_flight || 'none',
      needs_visa: formData.needs_visa || false,
      needs_hotel: formData.needs_hotel || false,
      needs_transport: formData.needs_transport || 'none',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEnrollment(id: string, formData: Partial<EnrollmentFormData>): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelEnrollment(id: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('mma_enrollments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', id)

  if (error) throw error
}

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('mma_roles')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getAvailablePeopleForEvent(eventId: string): Promise<Person[]> {
  const { data: enrolled } = await supabase
    .from('mma_enrollments')
    .select('person_id')
    .eq('event_id', eventId)
    .eq('status', 'active')

  const enrolledIds = enrolled?.map(e => e.person_id) || []

  let query = supabase
    .from('mma_people')
    .select('*')
    .order('compiled_name')

  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function linkCornerToFighter(fighterEnrollmentId: string, cornerEnrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_enrollment_corners')
    .insert({
      fighter_enrollment_id: fighterEnrollmentId,
      corner_enrollment_id: cornerEnrollmentId,
    })

  if (error) throw error
}

export async function unlinkCornerFromFighter(fighterEnrollmentId: string, cornerEnrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_enrollment_corners')
    .delete()
    .eq('fighter_enrollment_id', fighterEnrollmentId)
    .eq('corner_enrollment_id', cornerEnrollmentId)

  if (error) throw error
}

export async function getCornersByFighter(fighterEnrollmentId: string): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from('mma_enrollment_corners')
    .select(`
      corner:corner_enrollment_id(
        *,
        person:mma_people(*),
        role:mma_roles(*)
      )
    `)
    .eq('fighter_enrollment_id', fighterEnrollmentId)

  if (error) throw error
  return data?.map((d: any) => d.corner) || []
}

export async function getFightersByCorner(cornerEnrollmentId: string): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from('mma_enrollment_corners')
    .select(`
      fighter:fighter_enrollment_id(
        *,
        person:mma_people(*),
        role:mma_roles(*)
      )
    `)
    .eq('corner_enrollment_id', cornerEnrollmentId)

  if (error) throw error
  return data?.map((d: any) => d.fighter) || []
}

export async function getEnrollmentStats(eventId: string) {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      role:mma_roles(code),
      needs_flight,
      needs_visa,
      needs_hotel,
      needs_transport
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')

  if (error) throw error

  const stats = {
    total: data?.length || 0,
    fighters: data?.filter((e: any) => e.role?.code === 'F').length || 0,
    corners: data?.filter((e: any) => e.role?.code === 'C').length || 0,
    staff: data?.filter((e: any) => e.role?.code === 'ST').length || 0,
    guests: data?.filter((e: any) => e.role?.code === 'G').length || 0,
    needsFlight: data?.filter((e: any) => e.needs_flight !== 'none').length || 0,
    needsVisa: data?.filter((e: any) => e.needs_visa).length || 0,
    needsHotel: data?.filter((e: any) => e.needs_hotel).length || 0,
    needsTransport: data?.filter((e: any) => e.needs_transport !== 'none').length || 0,
  }

  return stats
}
