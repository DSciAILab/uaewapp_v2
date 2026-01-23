import { createClient } from '@/lib/supabase/client';
import { Hotel, HotelFormData, HotelFilters, HotelStatus } from '@/types/hotel';
import { calculateHotelDates, detectDivergences, getPrimaryDivergence } from '@/lib/utils/hotel-calculations';

const supabase = createClient();

export async function getEventHotels(
  eventId?: string,
  filters?: HotelFilters
): Promise<Hotel[]> {
  let query = supabase
    .from('mma_hotels')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        event_id,
        person:mma_people!inner(id, compiled_name, role),
        mma_flights(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.has_divergence !== undefined) {
    query = query.eq('has_divergence', filters.has_divergence);
  }
  if (filters?.divergence_approved !== undefined) {
    query = query.eq('divergence_approved', filters.divergence_approved);
  }
  if (filters?.hotel_name) {
    query = query.ilike('hotel_name', `%${filters.hotel_name}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch hotel reservations: ' + error.message);

  let results = (data || []).map((d: any) => {
    // Process flights to find arrival and departure info
    const flights = d.enrolled.mma_flights || [];
    // Assuming the most recent flight record or valid one is relevant
    // If there are multiple, we might need logic, but usually it's one active flight plan
    const flight = flights[0]; 

    const arrival_datetime = flight?.arrival_date && flight?.arrival_time 
      ? `${flight.arrival_date}T${flight.arrival_time}` 
      : null;
      
    const departure_datetime = flight?.departure_date && flight?.departure_time
      ? `${flight.departure_date}T${flight.departure_time}`
      : null;

    return {
      ...d,
      enrolled: {
        ...d.enrolled,
        person: {
          ...d.enrolled.person,
          full_name: d.enrolled.person.compiled_name // Mapping for type compatibility
        },
        arrival_flight: { arrival_datetime },
        departure_flight: { departure_datetime }
      }
    };
  }) as Hotel[];
  
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(hotel => 
      hotel.enrolled?.person?.full_name.toLowerCase().includes(searchLower) ||
      hotel.hotel_name.toLowerCase().includes(searchLower) ||
      hotel.confirmation_number?.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

export async function getHotelById(hotelId: string): Promise<Hotel | null> {
  const { data, error } = await supabase
    .from('mma_hotels')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, compiled_name, role),
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
        ...data.enrolled.person,
        full_name: data.enrolled.person.compiled_name
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
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      flights:mma_flights(*)
    `)
    .eq('id', formData.enrolled_id)
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

  const divergences = detectDivergences(
    calculated.checkin,
    calculated.checkout,
    formData.actual_checkin,
    formData.actual_checkout
  );

  const hasDivergence = divergences.length > 0;
  const primaryDivergence = getPrimaryDivergence(divergences);

  const insertData = {
    event_id: eventId,
    enrollment_id: formData.enrollment_id,
    hotel_name: formData.hotel_name,
    room_type: formData.room_type || null,
    calculated_checkin: calculated.checkin.toISOString(),
    calculated_checkout: calculated.checkout.toISOString(),
    actual_checkin: formData.actual_checkin,
    actual_checkout: formData.actual_checkout,
    has_divergence: hasDivergence,
    divergence_type: primaryDivergence,
    divergence_reason: formData.divergence_reason || null,
    divergence_approved: false,
    confirmation_number: formData.confirmation_number || null,
    status: formData.status,
    notes: formData.notes || null
  };

  const { data, error } = await supabase
    .from('mma_hotels')
    .insert(insertData)
    .select()
    .single();

  if (error) throw new Error('Failed to create hotel reservation: ' + error.message);

  return data;
}

export async function updateHotel(
  hotelId: string,
  formData: Partial<HotelFormData>,
  eventDates?: { event_date: string; event_end_date: string }
): Promise<Hotel> {
  let updateData: Record<string, any> = { ...formData };

  if (formData.actual_checkin || formData.actual_checkout) {
    const current = await getHotelById(hotelId);
    if (!current) throw new Error('Hotel not found');

    const actualCheckin = formData.actual_checkin || current.actual_checkin;
    const actualCheckout = formData.actual_checkout || current.actual_checkout;

    const divergences = detectDivergences(
      new Date(current.calculated_checkin),
      new Date(current.calculated_checkout),
      actualCheckin,
      actualCheckout
    );

    const hasDivergence = divergences.length > 0;
    const primaryDivergence = getPrimaryDivergence(divergences);

    updateData = {
      ...updateData,
      has_divergence: hasDivergence,
      divergence_type: primaryDivergence,
      divergence_approved: hasDivergence ? false : current.divergence_approved
    };
  }

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
  const { error } = await supabase
    .from('mma_hotels')
    .delete()
    .eq('id', hotelId);

  if (error) throw new Error('Failed to delete hotel reservation');
}

export async function updateHotelStatus(hotelId: string, status: HotelStatus): Promise<Hotel> {
  const { data, error } = await supabase
    .from('mma_hotels')
    .update({ status })
    .eq('id', hotelId)
    .select()
    .single();

  if (error) throw new Error('Failed to update hotel status');

  return data;
}

export async function getEnrolledWithoutHotel(eventId: string): Promise<Array<{
  id: string;
  person: { id: string; compiled_name: string; role: string };
  flights?: any[];
}>> {
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id, 
      person:mma_people!inner(id, compiled_name, role),
      flights:mma_flights(*)
    `)
    .eq('event_id', eventId)
    .eq('needs_hotel', true);

  if (enrolledError) throw enrolledError;

  const { data: hotels, error: hotelsError } = await supabase
    .from('mma_hotels')
    .select('enrollment_id')
    .eq('event_id', eventId);

  if (hotelsError) throw hotelsError;

  const hotelEnrolledIds = new Set(hotels?.map(h => h.enrollment_id) || []);

  return (enrolled || []).map((e: any) => ({
    id: e.id,
    person: Array.isArray(e.person) ? e.person[0] : e.person,
    flights: e.flights
  })).filter(e => !hotelEnrolledIds.has(e.id));
}

export async function getHotelStats(eventId: string): Promise<{
  total: number;
  confirmed: number;
  pending: number;
  with_divergence: number;
  pending_approval: number;
}> {
  const { data, error } = await supabase
    .from('mma_hotels')
    .select('status, has_divergence, divergence_approved')
    .eq('event_id', eventId);

  if (error) throw error;

  const hotels = data || [];

  return {
    total: hotels.length,
    confirmed: hotels.filter(h => h.status === 'confirmed').length,
    pending: hotels.filter(h => h.status === 'pending').length,
    with_divergence: hotels.filter(h => h.has_divergence).length,
    pending_approval: hotels.filter(h => h.has_divergence && !h.divergence_approved).length
  };
}
