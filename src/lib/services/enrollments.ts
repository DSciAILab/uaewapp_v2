import { createClient } from '@/lib/supabase/client'
import type { Enrollment, Role, Person, TransportNeed, FlightType } from '@/types/database'
import type { Database } from '@/types/supabase'

function getClient() {
  return createClient();
}

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
  corner?: string | null
}

export async function getEnrollmentsByEvent(eventId: string): Promise<EnrollmentWithDetails[]> {
  const supabase = getClient();
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
  return (data || []) as unknown as EnrollmentWithDetails[]
}

export async function getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
  const supabase = getClient();
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
  return data as unknown as EnrollmentWithDetails
}

export async function createEnrollment(formData: EnrollmentFormData): Promise<Enrollment> {
  const supabase = getClient();
  
  const allowedFields = [
    'event_id', 'person_id', 'role_id', 'needs_flight', 'needs_visa', 
    'needs_hotel', 'needs_transport', 'corner'
  ];

  const insertData: Record<string, unknown> = {
    status: 'active',
    cancelled_at: null,
    cancellation_reason: null,
    needs_flight: formData.needs_flight || 'none',
    needs_visa: formData.needs_visa || false,
    needs_hotel: formData.needs_hotel || false,
    needs_transport: formData.needs_transport || 'none',
  };

  allowedFields.forEach(field => {
    if (field in formData) {
      insertData[field] = formData[field as keyof EnrollmentFormData];
    }
  });

  const { data, error } = await supabase
    .from('mma_enrollments')
    .upsert(insertData as Database['public']['Tables']['mma_enrollments']['Insert'], {
      onConflict: 'event_id, person_id',
      ignoreDuplicates: false
    })
    .select(`
      *,
      person:mma_people(*),
      role:mma_roles(*)
    `)
    .single()

  if (error) {
    console.error('Create enrollment error:', error);
    throw error;
  }

  // Sincronizar módulos relacionados e aguardar para garantir consistência antes do reload da UI
  if (data) {
     await syncRelatedModules(data as unknown as Enrollment)
  }

  return data as unknown as Enrollment
}

export async function updateEnrollment(id: string, formData: Partial<EnrollmentFormData>): Promise<Enrollment> {
  const supabase = getClient();
  
  const allowedFields = [
    'event_id', 'person_id', 'role_id', 'needs_flight', 'needs_visa', 
    'needs_hotel', 'needs_transport', 'corner', 'status', 'event_code_seq',
    'cancelled_at', 'cancellation_reason'
  ];

  const updatePayload: Record<string, unknown> = {};
  allowedFields.forEach(field => {
    if (field in formData) {
      updatePayload[field] = formData[field as keyof EnrollmentFormData];
    }
  });

  const { data, error } = await supabase
    .from('mma_enrollments')
    .update(updatePayload as Database['public']['Tables']['mma_enrollments']['Update'])
    .eq('id', id)
    .select(`
      *,
      person:mma_people(*),
      role:mma_roles(*)
    `)
    .single()

  if (error) {
    console.error('Update enrollment error:', error);
    throw error;
  }

  // Sincronizar módulos relacionados e aguardar para garantir consistência
  await syncRelatedModules(data as unknown as Enrollment)

  return data as unknown as Enrollment
}

/**
 * Sincroniza registros nos módulos variados (Voo, Visto, Hotel) baseados nas flags de necessidade.
 * Cria registros placeholder se não existirem.
 * Puxa dados da pessoa (document_folder, nationality) para pré-preencher o visto.
 */
async function syncRelatedModules(enrollment: Enrollment) {
  const supabase = getClient();
  const { event_id, id: enrolled_id, needs_visa, needs_hotel, needs_flight } = enrollment
  const person = (enrollment as { person?: Person }).person

  console.log('Syncing related modules for enrollment:', { enrolled_id, needs_visa, needs_hotel, needs_flight })

  // 1. Sincronizar Visto
  if (needs_visa) {
    const { data: existingVisa } = await supabase
      .from('mma_visas')
      .select('id')
      .eq('enrollment_id', enrolled_id)
      .maybeSingle()

    if (!existingVisa) {
      const visaInsert: Record<string, unknown> = {
        enrollment_id: enrolled_id,
        status: 2, // Required/Pendente
        is_done: false
      }

      // Pré-preencher com dados da pessoa se disponíveis
      if (person) {
        if (person.document_folder) {
          visaInsert.document_link = person.document_folder
        }
        if (person.nationality) {
          visaInsert.nationality = person.nationality
        }
        if (person.compiled_name) {
          visaInsert.passport_name = person.compiled_name
        }
      }

      const { error: visaError } = await supabase.from('mma_visas').insert(visaInsert as Database['public']['Tables']['mma_visas']['Insert'])
      if (visaError) console.error('Error auto-creating visa:', visaError)
      else console.log('Auto-created visa for enrollment', enrolled_id, 'with person data:', !!person)
    }
  }

  // 2. Sincronizar Voo (NEW)
  if (needs_flight && needs_flight !== 'none') {
    const { data: existingFlight } = await supabase
      .from('mma_flights')
      .select('id')
      .eq('enrollment_id', enrolled_id)
      .maybeSingle()

    if (!existingFlight) {
        const { error: flightError } = await supabase.from('mma_flights').insert({
            enrollment_id: enrolled_id,
            type: needs_flight,
            status: 'pending'
        })
        if (flightError) console.error('Error auto-creating flight:', flightError)
        else console.log('Auto-created flight for enrollment', enrolled_id)
    }
  }

  // 3. Sincronizar Hotel
  if (needs_hotel) {
    const { data: existingHotel } = await supabase
      .from('mma_hotels')
      .select('id')
      .eq('enrollment_id', enrolled_id)
      .maybeSingle()

    if (!existingHotel) {
      // Buscar dados do evento para datas padrão
      const { data: event } = await supabase
        .from('mma_events')
        .select('event_date, event_end_date')
        .eq('id', event_id)
        .single()

      if (event && event.event_date) {
        const checkin = new Date(event.event_date)
        checkin.setDate(checkin.getDate() - 1)
        
        const checkout = new Date(event.event_end_date || event.event_date)
        checkout.setDate(checkout.getDate() + 1)

        const { error: hotelError } = await supabase.from('mma_hotels').insert({
          event_id,
          enrollment_id: enrolled_id,
          hotel_name: 'TBD',
          status: 'pending',
          suggested_checkin_date: checkin.toISOString(),
          suggested_checkout_date: checkout.toISOString(),
          checkin_date: checkin.toISOString().split('T')[0],
          checkout_date: checkout.toISOString().split('T')[0],
          has_divergence: false
        })
        if (hotelError) console.error('Error auto-creating hotel:', hotelError)
        else console.log('Auto-created hotel for enrollment', enrolled_id)
      } else {
        console.warn('Cannot auto-create hotel: Event dates missing for event', event_id)
      }
    }
  }
}

export async function cancelEnrollment(id: string, reason?: string): Promise<void> {
  const supabase = getClient();
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

export async function updateEnrollmentCorner(eventId: string, personId: string, corner: string | null): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_enrollments')
    .update({ corner })
    .eq('event_id', eventId)
    .eq('person_id', personId);

  if (error) throw error;
}

export async function getRoles(): Promise<Role[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_roles')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return (data || []) as unknown as Role[]
}

export async function getAvailablePeopleForEvent(eventId: string): Promise<Person[]> {
  const supabase = getClient();
  const { data: enrolled } = await supabase
    .from('mma_enrollments')
    .select('person_id')
    .eq('event_id', eventId)
    .eq('status', 'active')

  const enrolledIds = enrolled?.map((e) => e.person_id) || []

  let query = supabase
    .from('mma_people')
    .select('*')
    .order('compiled_name')

  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []) as unknown as Person[]
}

export async function linkCornerToFighter(fighterEnrollmentId: string, cornerEnrollmentId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_enrollment_corners')
    .insert({
      fighter_enrollment_id: fighterEnrollmentId,
      corner_enrollment_id: cornerEnrollmentId,
    })

  if (error) throw error
}

export async function unlinkCornerFromFighter(fighterEnrollmentId: string, cornerEnrollmentId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_enrollment_corners')
    .delete()
    .eq('fighter_enrollment_id', fighterEnrollmentId)
    .eq('corner_enrollment_id', cornerEnrollmentId)

  if (error) throw error
}

export async function getCornersByFighter(fighterEnrollmentId: string): Promise<EnrollmentWithDetails[]> {
  const supabase = getClient();
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
  return (data?.map((d) => d.corner) || []) as unknown as EnrollmentWithDetails[]
}

export async function getFightersByCorner(cornerEnrollmentId: string): Promise<EnrollmentWithDetails[]> {
  const supabase = getClient();
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
  return (data?.map((d) => d.fighter) || []) as unknown as EnrollmentWithDetails[]
}

export async function getEnrollmentStats(eventId: string) {
  const supabase = getClient();
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
    fighters: data?.filter((e) => (e.role as { code: string } | null)?.code === 'F').length || 0,
    corners: data?.filter((e) => (e.role as { code: string } | null)?.code === 'C').length || 0,
    staff: data?.filter((e) => (e.role as { code: string } | null)?.code === 'ST').length || 0,
    guests: data?.filter((e) => (e.role as { code: string } | null)?.code === 'G').length || 0,
    needsFlight: data?.filter((e) => e.needs_flight !== 'none').length || 0,
    needsVisa: data?.filter((e) => e.needs_visa).length || 0,
    needsHotel: data?.filter((e) => e.needs_hotel).length || 0,
    needsTransport: data?.filter((e) => e.needs_transport !== 'none').length || 0,
  }

  return stats
}

export async function bulkCreateEnrollments(
  eventId: string,
  peopleIds: string[],
  baseData: Partial<EnrollmentFormData>
): Promise<{ success: number; errors: string[] }> {
  const supabase = createClient();
  console.log(`[bulkCreateEnrollments] Starting for ${peopleIds.length} people`);
  let successCount = 0;
  const errors: string[] = [];

  for (const personId of peopleIds) {
    try {
      const { data, error } = await supabase
        .from('mma_enrollments')
        .upsert({
          event_id: eventId,
          person_id: personId,
          role_id: baseData.role_id || '',
          needs_flight: baseData.needs_flight || 'none',
          needs_visa: baseData.needs_visa || false,
          needs_hotel: baseData.needs_hotel || false,
          needs_transport: baseData.needs_transport || 'none',
          status: 'active',
          cancelled_at: null,
          cancellation_reason: null,
        }, {
          onConflict: 'event_id, person_id',
          ignoreDuplicates: false
        })
        .select(`
          *,
          person:mma_people(*),
          role:mma_roles(*)
        `)
        .single();

      if (error) throw error;
      if (data) {
        await syncRelatedModules(data as unknown as Enrollment);
        successCount++;
      }
    } catch (err) {
      console.error(`Error enrolling person ${personId}:`, err);
      errors.push(personId);
    }
  }

  return { success: successCount, errors };
}
