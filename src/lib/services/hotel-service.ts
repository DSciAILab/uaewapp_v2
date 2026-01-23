import { createClient } from '@/lib/supabase/client';
import { Hotel, HotelFormData, HotelFilters, HotelStatus } from '@/types/hotel';
import { calculateHotelDates, detectDivergences, getPrimaryDivergence } from '@/lib/utils/hotel-calculations';

const supabase = createClient();

export async function getEventHotels(
  eventId: string,
  filters?: HotelFilters
): Promise<Hotel[]> {
  let query = supabase
    .from('mma_hotels')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, compiled_name, role),
        arrival_flight:mma_flights!mma_enrollments_arrival_flight_id_fkey(id, flight_number, arrival_datetime),
        departure_flight:mma_flights!mma_enrollments_departure_flight_id_fkey(id, flight_number, departure_datetime)
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

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

  let results = (data || []).map((d: any) => ({
    ...d,
    enrolled: {
      ...d.enrolled,
      person: {
        ...d.enrolled.person,
        full_name: d.enrolled.person.compiled_name // Mapping for type compatibility
      }
    }
  })) as Hotel[];
  
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
        arrival_flight:mma_flights!mma_enrollments_arrival_flight_id_fkey(arrival_datetime),
        departure_flight:mma_flights!mma_enrollments_departure_flight_id_fkey(departure_datetime)
      )
    `)
    .eq('id', hotelId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch hotel reservation: ' + error.message);
  }

  return {
    ...data,
    enrolled: {
      ...data.enrolled,
      person: {
        ...data.enrolled.person,
        full_name: data.enrolled.person.compiled_name
      }
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
      arrival_flight:mma_flights!mma_enrollments_arrival_flight_id_fkey(arrival_datetime),
      departure_flight:mma_flights!mma_enrollments_departure_flight_id_fkey(departure_datetime)
    `)
    .eq('id', formData.enrolled_id)
    .single();

  if (enrolledError) throw new Error('Failed to fetch enrollment data: ' + enrolledError.message);

  const calculated = calculateHotelDates(
    {
      arrival_datetime: (enrolled as any).arrival_flight?.arrival_datetime || null,
      departure_datetime: (enrolled as any).departure_flight?.departure_datetime || null
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
    enrolled_id: formData.enrolled_id,
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
}>> {
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`id, person:mma_people!inner(id, compiled_name, role)`)
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  const { data: hotels, error: hotelsError } = await supabase
    .from('mma_hotels')
    .select('enrolled_id')
    .eq('event_id', eventId);

  if (hotelsError) throw hotelsError;

  const hotelEnrolledIds = new Set(hotels?.map(h => h.enrolled_id) || []);

  return (enrolled || []).map((e: any) => ({
    id: e.id,
    person: Array.isArray(e.person) ? e.person[0] : e.person
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
