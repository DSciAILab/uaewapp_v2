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
      person:mma_people(id, compiled_name, fighter_id),
      role:mma_roles(name),
      flights:mma_flights(*),
      event:mma_events(name, event_date, event_end_date),
      hotel:mma_hotels(*)
    `)
    .eq('needs_hotel', true)
    .eq('status', 'active');

  if (eventId) {
    query = query.eq('event_id', eventId);
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
          full_name: e.person?.compiled_name || 'Unnamed Person',
          fighter_id: e.person?.fighter_id,
          role: (Array.isArray(e.role) ? e.role[0]?.name : e.role?.name) || 'N/A',
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
      event_id: e.event_id,
      enrollment_id: e.id,
      hotel_name: 'Pending Booking',
      status: 'pending',
      has_divergence: false,
      divergence_approved: false,
      calculated_checkin: virtualDates.checkin.toISOString(),
      calculated_checkout: virtualDates.checkout.toISOString(),
      actual_checkin: '',
      actual_checkout: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...commonData
    } as unknown as Hotel;
  }).filter((h: any): h is Hotel => h !== null);
  
  // Client-side filtering for complex fields or virtual records
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(hotel => 
      (hotel.enrolled?.person?.full_name || '').toLowerCase().includes(searchLower) ||
      (hotel.hotel_name || '').toLowerCase().includes(searchLower) ||
      (hotel.confirmation_number || '').toLowerCase().includes(searchLower)
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
    const nameA = a?.enrolled?.person?.full_name || '';
    const nameB = b?.enrolled?.person?.full_name || '';
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
        person:mma_people!inner(id, compiled_name, fighter_id),
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
        full_name: data.enrolled.person.compiled_name,
        fighter_id: data.enrolled.person.fighter_id,
        role: data.enrolled.role?.name || 'N/A',
        event_name: data.enrolled.event?.name
      },
      arrival_flight: { arrival_datetime },
      departure_flight: { departure_datetime }
    }
  } as Hotel;
}

// Helper to get the most common/latest hotel name for an event
async function getEventDefaultHotelName(eventId: string): Promise<string> {
  try {
    const supabase = getClient();
    const { data } = await supabase
      .from('mma_hotels')
      .select('hotel_name')
      .eq('event_id', eventId)
      .neq('hotel_name', 'TBD')
      .neq('hotel_name', 'Pending Booking')
      .neq('hotel_name', 'Event Hotel')
      .order('created_at', { ascending: false })
      .limit(1);
      
    return data?.[0]?.hotel_name || 'Event Hotel';
  } catch (e) {
    return 'Event Hotel';
  }
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
  const actualCheckin = (formData.actual_checkin || (calculated.checkin ? calculated.checkin.toISOString() : '')).split('T')[0];
  const actualCheckout = (formData.actual_checkout || (calculated.checkout ? calculated.checkout.toISOString() : '')).split('T')[0];

  const divergences = detectDivergences(
    calculated.checkin,
    calculated.checkout,
    actualCheckin,
    actualCheckout
  );

  const hasDivergence = divergences.length > 0;
  const primaryDivergence = getPrimaryDivergence(divergences);

  // If no hotel name is provided, try to find one from other event bookings
  const hotel_name = formData.hotel_name || await getEventDefaultHotelName(eventId);

  const saveData = {
    event_id: eventId,
    enrollment_id: formData.enrollment_id,
    hotel_name: hotel_name,
    room_type: formData.room_type || null,
    room_number: formData.room_number || null,
    calculated_checkin: calculated.checkin.toISOString(),
    calculated_checkout: calculated.checkout.toISOString(),
    actual_checkin: actualCheckin,
    actual_checkout: actualCheckout,
    has_divergence: hasDivergence,
    primary_divergence_type: primaryDivergence,
    divergence_reason: formData.divergence_reason || null,
    divergence_approved: formData.divergence_reason ? false : (hasDivergence ? false : true),
    confirmation_number: formData.confirmation_number || null,
    status: formData.status,
    notes: formData.notes || null,
    updated_at: new Date().toISOString()
  };

  if (formData.checked_in_at) {
      (saveData as any).checked_in_at = formData.checked_in_at;
  }


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
  const actualCheckin = (formData.actual_checkin || current.actual_checkin || '').split('T')[0];
  const actualCheckout = (formData.actual_checkout || current.actual_checkout || '').split('T')[0];

  const divergences = detectDivergences(
    calculated.checkin,
    calculated.checkout,
    actualCheckin,
    actualCheckout
  );

  const hasDivergence = divergences.length > 0;
  const primaryDivergence = getPrimaryDivergence(divergences);

  const updateData = {
    hotel_name: formData.hotel_name || current.hotel_name,
    room_type: formData.room_type !== undefined ? formData.room_type : current.room_type,
    actual_checkin: actualCheckin,
    actual_checkout: actualCheckout,
    calculated_checkin: calculated.checkin.toISOString(),
    calculated_checkout: calculated.checkout.toISOString(),
    has_divergence: hasDivergence,
    primary_divergence_type: primaryDivergence,
    divergence_reason: formData.divergence_reason !== undefined ? formData.divergence_reason : current.divergence_reason,
    confirmation_number: formData.confirmation_number !== undefined ? formData.confirmation_number : current.confirmation_number,
    status: formData.status || current.status,
    notes: formData.notes !== undefined ? formData.notes : current.notes,
    // Reset approval if dates changed and are divergent
    divergence_approved: (actualCheckin !== current.actual_checkin || actualCheckout !== current.actual_checkout) && hasDivergence 
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
      approved_by: approverId,
      approved_at: new Date().toISOString()
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
      approved_by: null,
      approved_at: null
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
      hotel_name: '', // Service will fetch default
      actual_checkin: '', // Service will calculate
      actual_checkout: ''
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
      role: e.role?.name || 'N/A'
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
  if (data.hotel_name) updateData.hotel_name = data.hotel_name;
  if (data.room_type) updateData.room_type = data.room_type;
  if (data.room_number !== undefined) updateData.room_number = data.room_number;
  if (data.actual_checkin) updateData.actual_checkin = data.actual_checkin;
  if (data.actual_checkout) updateData.actual_checkout = data.actual_checkout;
  if (data.checked_in_at !== undefined) updateData.checked_in_at = data.checked_in_at;

  const supabase = getClient();
  const { error } = await supabase
    .from('mma_hotels')
    .update(updateData)
    .in('id', hotelIds);

  if (error) throw new Error('Failed to batch update hotels: ' + error.message);
}

export async function checkInGuest(hotelId: string): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase
        .from('mma_hotels')
        .update({ 
            checked_in_at: new Date().toISOString(),
             // Auto-confirm if not confirmed, though prompt might be better?
             // Let's stick to just check-in time for now.
        })
        .eq('id', hotelId);

    if (error) throw new Error('Failed to check in guest: ' + error.message);
}

export async function checkOutGuest(hotelId: string): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase
        .from('mma_hotels')
        .update({ checked_in_at: null })
        .eq('id', hotelId);

    if (error) throw new Error('Failed to check out guest: ' + error.message);
}
