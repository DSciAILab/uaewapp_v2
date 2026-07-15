import { createClient } from '@/lib/supabase/client';
import { Hotel, HotelFormData, HotelFilters, HotelStatus } from '@/types/hotel';
import { calculateHotelDates, detectDivergences, getPrimaryDivergence } from '@/lib/utils/hotel-calculations';

const getClient = () => createClient();

export async function getEventHotels(
  eventId?: string,
  filters?: HotelFilters
): Promise<Hotel[]> {
  const supabase = getClient();
  // We use mma_enrollments as the primary source to ensure everyone who "needs_hotel" is included
  let query = supabase
    .from('mma_enrollments')
    .select(`
      id,
      event_id,
      status,
      needs_hotel,
      person:mma_people(id, compiled_name, appadmin_fighter_id),
      role:mma_roles(name),
      flights:mma_flights(*),
      event:mma_events!inner(name, status, event_date, event_end_date),
      hotel:mma_hotels(*)
    `)
    .eq('needs_hotel', true)
    .eq('status', 'active');

  if (eventId) {
    query = query.eq('event_id', eventId);
  } else {
    // Global view: only show enrollments from active events
    query = query.eq('event.status', 'active');
  }

  const { data: enrollments, error } = await query;
  if (error) throw new Error('Failed to fetch hotel data: ' + error.message);

  let results: Hotel[] = (enrollments || []).map((e: any) => {
    // Supabase can return an object (1:1 with unique) or an array (1:N)
    // We check for both to ensure robust mapping
    const rawHotel = e.hotel;
    const hotelRecord = Array.isArray(rawHotel) ? rawHotel[0] : rawHotel;
    const flight = e.flights?.[0];
    const event = e.event;

    const arrival_datetime = flight?.arrival_date && flight?.arrival_time 
      ? `${flight.arrival_date}T${flight.arrival_time}` 
      : null;
      
    const departure_datetime = flight?.departure_date && flight?.departure_time
      ? `${flight.departure_date}T${flight.departure_time}`
      : null;

    const commonData = {
      enrolled: {
        id: e.id,
        event_id: e.event_id,
        person: {
          id: e.person?.id || 'unknown',
          compiled_name: e.person?.compiled_name || 'Unnamed Person',
          appadmin_fighter_id: e.person?.appadmin_fighter_id,
          role: (Array.isArray(e.role) ? e.role[0]?.name : (e.person?.role as any)?.name || e.person?.role) || 'N/A',
          event_name: e.event?.name
        },
        arrival_flight: { arrival_datetime },
        departure_flight: { departure_datetime }
      }
    };

    if (hotelRecord) {
      return {
        ...hotelRecord,
        ...commonData
      } as Hotel;
    }

    // Return a virtual "Pending" hotel if no reservation exists in DB
    if (!event) {
        return null;
    }

    const virtualDates = calculateHotelDates(
      { arrival_datetime, departure_datetime },
      event.event_date,
      event.event_end_date || event.event_date
    );

    return {
      id: `missing-${e.id}`,
      enrollment_id: e.id,
      status: 'pending',
      has_divergence: false,
      divergence_approved: false,
      suggested_checkin_date: virtualDates.checkin.toISOString().split('T')[0],
      suggested_checkout_date: virtualDates.checkout.toISOString().split('T')[0],
      checkin_date: null,
      checkout_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...commonData
    } as unknown as Hotel;
  }).filter((h: any): h is Hotel => h !== null);
  
  // Client-side filtering for complex fields or virtual records
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(hotel => 
      (hotel.enrolled?.person?.compiled_name || '').toLowerCase().includes(searchLower) ||
      (hotel.reservation_number || '').toLowerCase().includes(searchLower)
    );
  }

  if (filters?.status) {
    results = results.filter(hotel => hotel.status === filters.status);
  }
  if (filters?.has_divergence !== undefined) {
    results = results.filter(hotel => hotel.has_divergence === filters.has_divergence);
  }
  if (filters?.divergence_approved !== undefined) {
    results = results.filter(hotel => hotel.divergence_approved === filters.divergence_approved);
  }

  if (!Array.isArray(results)) return [];

  // Sort by name for consistency
  return results.sort((a, b) => {
    const nameA = a?.enrolled?.person?.compiled_name || '';
    const nameB = b?.enrolled?.person?.compiled_name || '';
    return nameA.localeCompare(nameB);
  });
}

export async function getHotelById(hotelId: string): Promise<Hotel | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_hotels')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, compiled_name, appadmin_fighter_id),
        role:mma_roles(name),
        event:mma_events(name),
        flights:mma_flights(*)
      )
    `)
    .eq('id', hotelId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch hotel reservation: ' + error.message);
  }

  const flights = data.enrolled.flights || [];
  const flight = flights[0];

  const arrival_datetime = flight?.arrival_date && flight?.arrival_time 
    ? `${flight.arrival_date}T${flight.arrival_time}` 
    : null;
    
  const departure_datetime = flight?.departure_date && flight?.departure_time
    ? `${flight.departure_date}T${flight.departure_time}`
    : null;

  return {
    ...data,
    enrolled: {
      ...data.enrolled,
      person: {
        id: data.enrolled.person.id,
        compiled_name: data.enrolled.person.compiled_name,
        appadmin_fighter_id: data.enrolled.person.appadmin_fighter_id,
        role: data.enrolled.role?.name || 'N/A',
        event_name: data.enrolled.event?.name
      },
      arrival_flight: { arrival_datetime },
      departure_flight: { departure_datetime }
    }
  } as Hotel;
}


export async function createHotel(
  eventId: string,
  formData: HotelFormData,
  eventDates: { event_date: string; event_end_date: string }
): Promise<Hotel> {
  const supabase = getClient();
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      flights:mma_flights(*)
    `)
    .eq('id', formData.enrollment_id)
    .single();

  if (enrolledError) throw new Error('Failed to fetch enrollment data: ' + enrolledError.message);

  const flights = (enrolled as any).flights || [];
  const flight = flights[0];

  const arrival_datetime = flight?.arrival_date && flight?.arrival_time 
    ? `${flight.arrival_date}T${flight.arrival_time}` 
    : null;
    
  const departure_datetime = flight?.departure_date && flight?.departure_time
    ? `${flight.departure_date}T${flight.departure_time}`
    : null;

  const calculated = calculateHotelDates(
    {
      arrival_datetime,
      departure_datetime
    },
    eventDates.event_date,
    eventDates.event_end_date || eventDates.event_date
  );

  // Ensure dates are just YYYY-MM-DD to avoid timezone shifting
  const finalCheckin = (formData.checkin_date || (calculated.checkin ? calculated.checkin.toISOString() : '')).split('T')[0];
  const finalCheckout = (formData.checkout_date || (calculated.checkout ? calculated.checkout.toISOString() : '')).split('T')[0];

  const divergences = detectDivergences(
    calculated.checkin,
    calculated.checkout,
    finalCheckin,
    finalCheckout
  );

  const hasDivergence = divergences.length > 0;
  const divergenceTypes = divergences.map(d => d.type);

  const saveData = {
    enrollment_id: formData.enrollment_id,
    suggested_checkin_date: calculated.checkin.toISOString().split('T')[0],
    suggested_checkout_date: calculated.checkout.toISOString().split('T')[0],
    checkin_date: finalCheckin || null,
    checkout_date: finalCheckout || null,
    has_divergence: hasDivergence,
    divergence_type: divergenceTypes,
    divergence_approved: formData.divergence_type ? false : (hasDivergence ? false : true),
    reservation_number: formData.reservation_number || null,
    status: formData.status,
    notes: formData.notes || null,
    updated_at: new Date().toISOString()
  };


  // First, check if a record already exists for this enrollment to avoid 409
  const { data: existing } = await supabase
    .from('mma_hotels')
    .select('id')
    .eq('enrollment_id', formData.enrollment_id)
    .single();

  let data, error;
  
  if (existing) {
    // Perform update instead of upsert to be safe
    const result = await supabase
      .from('mma_hotels')
      .update(saveData)
      .eq('id', existing.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Perform insert
    const result = await supabase
      .from('mma_hotels')
      .insert(saveData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    // If still failing due to race condition (unique violation), try one last update
    if (error.code === '23505') {
        const result = await supabase
          .from('mma_hotels')
          .update(saveData)
          .eq('enrollment_id', formData.enrollment_id)
          .select()
          .single();
        if (!result.error) return result.data;
    }
    throw new Error('Failed to save hotel reservation: ' + error.message);
  }

  return data;
}

export async function updateHotel(
  hotelId: string,
  formData: Partial<HotelFormData>,
  eventDates?: { event_date: string; event_end_date: string }
): Promise<Hotel> {
  // To ensure we have everything needed for recalculations, 
  // we fetch the current enrollment if it's an update.
  const supabase = getClient();
  const { data: current, error: fetchError } = await supabase
    .from('mma_hotels')
    .select(`
       *,
       enrolled:mma_enrollments!inner(
         id,
         event_id,
         event:mma_events(event_date, event_end_date),
         flights:mma_flights(*)
       )
    `)
    .eq('id', hotelId)
    .single();

  if (fetchError || !current) throw new Error('Hotel not found or error fetching current data');

  const enrollment = current.enrolled;
  const event = (enrollment as any).event;
  const flights = (enrollment as any).flights || [];
  const flight = flights[0];

  const arrival_datetime = flight?.arrival_date && flight?.arrival_time 
    ? `${flight.arrival_date}T${flight.arrival_time}` 
    : null;
    
  const departure_datetime = flight?.departure_date && flight?.departure_time
    ? `${flight.departure_date}T${flight.departure_time}`
    : null;

  // Use provided event dates or fall back to event lookup
  const baseEventDate = eventDates?.event_date || event?.event_date;
  const baseEventEnd = eventDates?.event_end_date || eventDates?.event_date || event?.event_end_date || event?.event_date;

  const calculated = calculateHotelDates(
    { arrival_datetime, departure_datetime },
    baseEventDate,
    baseEventEnd
  );

  // Ensure dates are just YYYY-MM-DD to avoid timezone shifting
  const finalCheckin = (formData.checkin_date || current.checkin_date || '').split('T')[0];
  const finalCheckout = (formData.checkout_date || current.checkout_date || '').split('T')[0];

  const divergences = detectDivergences(
    calculated.checkin,
    calculated.checkout,
    finalCheckin,
    finalCheckout
  );

  const hasDivergence = divergences.length > 0;
  const divergenceTypes = divergences.map(d => d.type);

  const updateData = {
    checkin_date: finalCheckin || null,
    checkout_date: finalCheckout || null,
    suggested_checkin_date: calculated.checkin.toISOString().split('T')[0],
    suggested_checkout_date: calculated.checkout.toISOString().split('T')[0],
    has_divergence: hasDivergence,
    divergence_type: divergenceTypes,
    reservation_number: formData.reservation_number !== undefined ? formData.reservation_number : current.reservation_number,
    status: formData.status || current.status,
    notes: formData.notes !== undefined ? formData.notes : current.notes,
    // Reset approval if dates changed and are divergent
    divergence_approved: (finalCheckin !== current.checkin_date || finalCheckout !== current.checkout_date) && hasDivergence 
      ? false 
      : current.divergence_approved,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('mma_hotels')
    .update(updateData)
    .eq('id', hotelId)
    .select()
    .single();

  if (error) throw new Error('Failed to update hotel reservation: ' + error.message);

  return data;
}

export async function approveDivergence(hotelId: string, approverId: string): Promise<Hotel> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_hotels')
    .update({
      divergence_approved: true,
      divergence_approved_by: approverId,
      divergence_approved_at: new Date().toISOString()
    })
    .eq('id', hotelId)
    .select()
    .single();

  if (error) throw new Error('Failed to approve divergence');

  return data;
}

export async function rejectDivergence(hotelId: string): Promise<Hotel> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_hotels')
    .update({
      divergence_approved: false,
      divergence_approved_by: null,
      divergence_approved_at: null
    })
    .eq('id', hotelId)
    .select()
    .single();

  if (error) throw new Error('Failed to reject divergence');

  return data;
}

export async function deleteHotel(hotelId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_hotels')
    .delete()
    .eq('id', hotelId);

  if (error) throw new Error('Failed to delete hotel reservation');
}

export async function updateHotelStatus(
  hotelId: string, 
  status: HotelStatus,
  eventDates?: { event_date: string; event_end_date: string }
): Promise<Hotel> {
  // If it's a virtual ID, we need to create the record first
  if (hotelId.startsWith('missing-')) {
    const enrollmentId = hotelId.replace('missing-', '');
    
    // We need to find the event_id first
    const supabase = getClient();
    const { data: enrollment } = await supabase
      .from('mma_enrollments')
      .select('event_id')
      .eq('id', enrollmentId)
      .single();
      
    if (!enrollment || !eventDates) {
       throw new Error('Cannot update status of virtual record without event details');
    }

    // Create the record with default behavior
    return await createHotel(enrollment.event_id, {
      enrollment_id: enrollmentId,
      status: status,
      checkin_date: '', // Service will calculate
      checkout_date: ''
    }, eventDates);
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_hotels')
    .update({ status })
    .eq('id', hotelId)
    .select()
    .single();

  if (error) throw new Error('Failed to update hotel status: ' + error.message);

  return data;
}

export async function getEnrolledWithoutHotel(eventId: string): Promise<Array<{
  id: string;
  person: { id: string; compiled_name: string; role: string };
  flights?: any[];
}>> {
  const supabase = getClient();
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id, 
      person:mma_people!inner(id, compiled_name),
      role:mma_roles(name),
      flights:mma_flights(*)
    `)
    .eq('event_id', eventId)
    .eq('needs_hotel', true)
    .eq('status', 'active');

  if (enrolledError) throw enrolledError;

  const { data: hotels, error: hotelsError } = await supabase
    .from('mma_hotels')
    .select('enrollment_id')
    .in('enrollment_id', enrolled?.map((e: any) => e.id) || []);
    
  // Add cache-buster
  (hotelsError as any); // just for reference

  if (hotelsError) throw hotelsError;

  const hotelEnrolledIds = new Set(hotels?.map((h: any) => h.enrollment_id) || []);

  return (enrolled || []).map((e: any) => ({
    id: e.id,
    person: {
      id: e.person.id,
      compiled_name: e.person.compiled_name,
      role: (e.person?.role as any)?.name || e.person?.role || 'N/A'
    },
    flights: e.flights
  })).filter((e: any) => !hotelEnrolledIds.has(e.id));
}

export async function getHotelStats(eventId: string): Promise<{
  total: number;
  confirmed: number;
  pending: number;
  with_divergence: number;
  pending_approval: number;
}> {
  // Use getEventHotels to get the unified list (including virtual missing ones)
  // This ensures stats match what the user sees in the table
  const hotels = await getEventHotels(eventId);

  return {
    total: hotels.length,
    confirmed: hotels.filter((h: any) => h.status === 'confirmed').length,
    pending: hotels.filter((h: any) => h.status === 'pending').length,
    with_divergence: hotels.filter((h: any) => h.has_divergence).length,
    pending_approval: hotels.filter((h: any) => h.has_divergence && !h.divergence_approved).length
  };
}

export async function updateHotelBatch(
  hotelIds: string[],
  data: Partial<HotelFormData>
): Promise<void> {
  if (!hotelIds.length) return;

  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (data.status) updateData.status = data.status;
  if (data.checkin_date) updateData.checkin_date = data.checkin_date;
  if (data.checkout_date) updateData.checkout_date = data.checkout_date;

  const supabase = getClient();
  const { error } = await supabase
    .from('mma_hotels')
    .update(updateData)
    .in('id', hotelIds);

  if (error) throw new Error('Failed to batch update hotels: ' + error.message);
}

// ==================== CSV IMPORT ====================

export interface HotelCSVRow {
  passport_name: string
  checkin_date?: string
  checkin_time?: string
  checkout_date?: string
  checkout_time?: string
  reservation_number?: string
  status?: string
  notes?: string
}

export interface HotelImportError {
  row: number
  name: string
  message: string
}

export async function importHotelsFromCSV(
  eventId: string,
  rows: HotelCSVRow[],
  upsertMode: boolean = true,
  onProgress?: (current: number, total: number, message?: string) => void
): Promise<{ created: number; updated: number; skipped: HotelImportError[]; errors: HotelImportError[] }> {
  const supabase = getClient()
  const errors: HotelImportError[] = []
  const skipped: HotelImportError[] = []
  let created = 0
  let updated = 0
  const total = rows.length
  const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0))

  if (onProgress) onProgress(0, total, 'Buscando participantes do evento...')

  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select('id, person:mma_people(id, compiled_name, event_name)')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('needs_hotel', true)

  if (enrollError) throw new Error('Falha ao buscar enrollments: ' + enrollError.message)

  const nameMap = new Map<string, string>()
  for (const e of (enrollments || []) as any[]) {
    const person = e.person
    if (!person) continue
    const compiledName = (person.compiled_name || '').trim().toLowerCase()
    const eventName = (person.event_name || '').trim().toLowerCase()
    if (compiledName) nameMap.set(compiledName, e.id)
    if (eventName && eventName !== compiledName) nameMap.set(eventName, e.id)
  }

  if (onProgress) onProgress(0, total, 'Verificando hotéis existentes...')
  const enrollmentIds = (enrollments || []).map((e: any) => e.id)
  const { data: existingHotels } = await supabase
    .from('mma_hotels')
    .select('id, enrollment_id')
    .in('enrollment_id', enrollmentIds.length > 0 ? enrollmentIds : ['__none__'])

  const existingMap = new Map<string, string>()
  for (const h of (existingHotels || [])) {
    existingMap.set(h.enrollment_id, h.id)
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    if (onProgress && i % 5 === 0) {
      onProgress(i, total, `Processando linha ${rowNum} de ${total}...`)
      await yieldToUI()
    }

    const passportName = (row.passport_name || '').trim()
    if (!passportName) {
      errors.push({ row: rowNum, name: '(vazio)', message: 'Nome do passaporte é obrigatório' })
      continue
    }

    const enrollmentId = nameMap.get(passportName.toLowerCase())
    if (!enrollmentId) {
      skipped.push({ row: rowNum, name: passportName, message: 'Pessoa não encontrada no evento ou não precisa de hotel' })
      continue
    }

    const hotelData: any = {
      enrollment_id: enrollmentId,
      checkin_date: row.checkin_date || null,
      checkin_time: row.checkin_time || null,
      checkout_date: row.checkout_date || null,
      checkout_time: row.checkout_time || null,
      reservation_number: row.reservation_number || null,
      status: row.status || 'confirmed',
      notes: row.notes || null,
    }

    const existingId = existingMap.get(enrollmentId)
    if (existingId) {
      if (upsertMode) {
        const { enrollment_id, ...updateData } = hotelData
        const { error: updateError } = await supabase.from('mma_hotels').update(updateData).eq('id', existingId)
        if (updateError) errors.push({ row: rowNum, name: passportName, message: updateError.message })
        else updated++
      } else {
        skipped.push({ row: rowNum, name: passportName, message: 'Hotel já existe (upsert desativado)' })
      }
    } else {
      const { error: insertError } = await supabase.from('mma_hotels').insert(hotelData)
      if (insertError) errors.push({ row: rowNum, name: passportName, message: insertError.message })
      else { created++; existingMap.set(enrollmentId, 'new') }
    }
  }

  if (onProgress) onProgress(total, total, 'Concluído!')
  return { created, updated, skipped, errors }
}
