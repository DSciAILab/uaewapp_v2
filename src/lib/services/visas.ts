import { createClient } from '@/lib/supabase/client'
import { isVisaStatus } from '@/types/database'
import type { Visa, VisaStatus, Enrollment } from '@/types/database'
import type { Database, Tables } from '@/types/supabase'

function getClient() {
  return createClient();
}

/** Exactly the person columns this service selects, straight from the DB types. */
type VisaPerson = Pick<
  Tables<'mma_people'>,
  | 'id'
  | 'compiled_name'
  | 'event_name'
  | 'appadmin_fighter_id'
  | 'nationality'
  | 'passport_number'
  | 'passport_expiry'
  | 'document_folder'
>

type VisaRole = Pick<Tables<'mma_roles'>, 'id' | 'name' | 'code'>

/**
 * Only the enrollment columns this service actually selects — the previous
 * `Enrollment &` claim was never true of the query (it selects 3 columns, not
 * the full row) and was only held up by the `as` cast this replaces.
 */
export interface VisaWithEnrollment extends Visa {
  enrollment: Pick<Enrollment, 'id' | 'event_id'> & {
    event_code: string | null
    person: VisaPerson
    role: VisaRole
  }
}

type VisaRow = Tables<'mma_visas'>

/**
 * mma_visas.status is an open `number` column — narrow it before it enters the
 * domain type. Throwing keeps an out-of-range status loud rather than letting
 * it masquerade as a valid one (a wrong visa state is an ops failure).
 */
function toVisa<T extends VisaRow>(row: T): Omit<T, 'status'> & { status: VisaStatus } {
  if (!isVisaStatus(row.status)) {
    throw new Error(
      `mma_visas.id=${row.id} has unsupported status ${row.status} (expected 1-6)`
    )
  }
  return { ...row, status: row.status }
}

export interface VisaFilters {
  eventId?: string
  status?: VisaStatus
  isDone?: boolean
  nationality?: string
  search?: string
}

export async function getVisasByEvent(eventId: string, filters: VisaFilters = {}): Promise<VisaWithEnrollment[]> {
  const supabase = getClient();
  let query = supabase
    .from('mma_visas')
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
          nationality,
          passport_number,
          passport_expiry,
          document_folder
        ),
        role:mma_roles(
          id,
          name,
          code
        )
      )
    `)
    .eq('enrollment.event_id', eventId)

  if (filters.status !== undefined) {
    query = query.eq('status', filters.status)
  }

  if (filters.isDone !== undefined) {
    query = query.eq('is_done', filters.isDone)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  
  // Client-side filtering for nested and nationality
  let results: VisaWithEnrollment[] = (data || []).map(toVisa)
  
  if (filters.nationality) {
    results = results.filter(v => 
      v.nationality === filters.nationality || 
      v.enrollment?.person?.nationality === filters.nationality
    )
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    results = results.filter(v => 
      v.passport_name?.toLowerCase().includes(searchLower) ||
      v.enrollment?.person?.compiled_name?.toLowerCase().includes(searchLower) ||
      v.enrollment?.event_code?.toLowerCase().includes(searchLower)
    )
  }
  
  return results
}

export async function getVisaByEnrollment(enrollmentId: string): Promise<Visa | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_visas')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  if (error) throw error
  return data ? toVisa(data) : null
}

export async function getVisaById(id: string): Promise<VisaWithEnrollment | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_visas')
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
          nationality,
          passport_number,
          passport_expiry,
          document_folder
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
  return toVisa(data)
}

export interface VisaFormData {
  enrollment_id: string
  passport_name?: string | null
  nationality?: string | null
  departure_airport?: string | null
  document_link?: string | null
  status?: VisaStatus | number | null
  is_done?: boolean | null
  notes?: string | null
}

export async function createVisa(formData: VisaFormData): Promise<Visa> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_visas')
    .insert({
      ...formData,
      status: formData.status || 2, // Required by default
      is_done: formData.is_done || false,
    })
    .select()
    .single()

  if (error) throw error
  return toVisa(data)
}

export async function updateVisa(id: string, formData: Partial<VisaFormData>): Promise<Visa> {
  // `status` and `is_done` are NOT NULL columns, so Update types them as
  // non-null while VisaFormData allows null. Lift them out and re-add only
  // when actually provided, so an explicit null becomes "not provided"
  // instead of a DB-rejected null write.
  const { status, is_done, ...rest } = formData
  const updateData: Database['public']['Tables']['mma_visas']['Update'] = { ...rest }
  if (status != null) updateData.status = status
  if (is_done != null) updateData.is_done = is_done

  // Se status for Approved (4) ou Not Required (1), marcar como done
  if (status === 4 || status === 1) {
    updateData.is_done = true
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_visas')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return toVisa(data)
}

export async function deleteVisa(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_visas')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getEnrollmentsNeedingVisa(eventId: string): Promise<any[]> {
  // Get enrollments that need visa but don't have one yet
  const supabase = getClient();
  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      event_code,
      needs_visa,
      person:mma_people(
        id,
        compiled_name,
        event_name,
        appadmin_fighter_id,
        nationality,
        passport_number,
        passport_expiry,
        document_folder
      ),
      role:mma_roles(
        id,
        name,
        code
      )
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('needs_visa', true)

  if (enrollError) throw enrollError

  // Get existing visas for this event
  const { data: visas, error: visaError } = await supabase
    .from('mma_visas')
    .select('enrollment_id')
    .in('enrollment_id', enrollments?.map(e => e.id) || [])

  if (visaError) throw visaError

  const existingVisaEnrollmentIds = new Set(visas?.map(v => v.enrollment_id) || [])

  // Filter enrollments without visas
  return (enrollments || []).filter(e => !existingVisaEnrollmentIds.has(e.id))
}

export async function getVisaStats(eventId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_visas')
    .select(`
      id,
      status,
      is_done,
      enrollment:mma_enrollments!inner(event_id)
    `)
    .eq('enrollment.event_id', eventId)

  if (error) throw error

  const visas = data || []
  
  return {
    total: visas.length,
    notRequired: visas.filter(v => v.status === 1).length,
    required: visas.filter(v => v.status === 2).length,
    applied: visas.filter(v => v.status === 3).length,
    approved: visas.filter(v => v.status === 4).length,
    rejected: visas.filter(v => v.status === 5).length,
    resident: visas.filter(v => v.status === 6).length,
    done: visas.filter(v => v.is_done).length,
    pending: visas.filter(v => !v.is_done).length,
  }
}

export async function getNationalitiesInEvent(eventId: string): Promise<string[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_visas')
    .select(`
      nationality,
      enrollment:mma_enrollments!inner(event_id)
    `)
    .eq('enrollment.event_id', eventId)
    .not('nationality', 'is', null)

  if (error) throw error

  const nationalities = [...new Set(data?.map(v => v.nationality).filter(Boolean))]
  return nationalities.sort() as string[]
}