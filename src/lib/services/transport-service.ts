import { createClient } from '@/lib/supabase/client';
import { Driver, DriverFormData, EventCar, EventCarFormData, CarPassenger, CarPassengerFormData } from '@/types/transport';

const getClient = () => createClient();

// ==================== DRIVERS ====================

export async function getDrivers(activeOnly: boolean = false): Promise<Driver[]> {
  const supabase = getClient();
  let query = supabase.from('mma_drivers').select('*').order('full_name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch drivers: ' + error.message);

  return data || [];
}

export async function getDriverById(driverId: string): Promise<Driver | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch driver: ' + error.message);
  }

  return data;
}

export async function createDriver(formData: DriverFormData): Promise<Driver> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_drivers')
    .insert({
      full_name: formData.full_name,
      phone: formData.phone || null,
      email: formData.email || null,
      license_number: formData.license_number || null,
      vehicle_info: formData.vehicle_info || null,
      is_active: formData.is_active,
      notes: formData.notes || null
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create driver: ' + error.message);

  return data;
}

export async function updateDriver(driverId: string, formData: Partial<DriverFormData>): Promise<Driver> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_drivers')
    .update(formData)
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw new Error('Failed to update driver: ' + error.message);

  return data;
}

export async function deactivateDriver(driverId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_drivers')
    .update({ is_active: false })
    .eq('id', driverId);

  if (error) throw new Error('Failed to deactivate driver: ' + error.message);
}

// ==================== EVENT CARS ====================

export async function getEventCars(eventId: string): Promise<EventCar[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_cars')
    .select(`
      *,
      driver:mma_drivers(*),
      passengers:mma_car_passengers(
        *,
        enrolled:mma_enrollments(
            id, 
            person:mma_people(id, compiled_name),
            role:mma_roles(name)
        ),
        flight:mma_flights(id, flight_number, arrival_date, arrival_time, departure_date, departure_time)
      )
    `)
    .eq('event_id', eventId)
    .order('car_number');

  if (error) throw new Error('Failed to fetch event cars: ' + error.message);
  
  // Transform nested data structure to match interface if needed
  // Supabase returns standard JSON which mostly matches, but need to ensure consistency
  return (data || []).map((car: any) => ({
      ...car,
      passengers: (car.passengers || []).map((p: any) => ({
          ...p,
          enrolled: {
            ...p.enrolled,
            person: {
                ...p.enrolled.person,
                role: p.enrolled.role?.name || 'N/A'
            }
          },
          flight: p.flight
      }))
  }));
}

export async function createEventCar(eventId: string, formData: EventCarFormData): Promise<EventCar> {
  const supabase = getClient();
  // Get max car number for auto-increment
  const { data: maxCar } = await supabase
    .from('mma_event_cars')
    .select('car_number')
    .eq('event_id', eventId)
    .order('car_number', { ascending: false })
    .limit(1)
    .single();

  const nextCarNumber = (maxCar?.car_number || 0) + 1;

  const { data, error } = await supabase
    .from('mma_event_cars')
    .insert({
      event_id: eventId,
      driver_id: formData.driver_id || null,
      car_number: nextCarNumber,
      car_label: formData.car_label || `Car ${nextCarNumber}`,
      capacity: formData.capacity,
      vehicle_type: formData.vehicle_type || null,
      license_plate: formData.license_plate || null,
      notes: formData.notes || null
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create car: ' + error.message);

  return data;
}

export async function updateEventCar(carId: string, formData: Partial<EventCarFormData>): Promise<EventCar> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_cars')
    .update(formData)
    .eq('id', carId)
    .select()
    .single();

  if (error) throw new Error('Failed to update car: ' + error.message);

  return data;
}

export async function deleteEventCar(carId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_event_cars')
    .delete()
    .eq('id', carId);

  if (error) throw new Error('Failed to delete car: ' + error.message);
}

// ==================== PASSENGERS ====================

export async function assignPassenger(carId: string, formData: CarPassengerFormData): Promise<CarPassenger> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('mma_car_passengers')
        .insert({
            car_id: carId,
            enrolled_id: formData.enrolled_id,
            flight_id: formData.flight_id || null,
            transport_type: formData.transport_type,
            pickup_location: formData.pickup_location || null,
            dropoff_location: formData.dropoff_location || null,
            pickup_time: formData.pickup_time || null,
            notes: formData.notes || null
        })
        .select()
        .single();
    
    if (error) throw new Error('Failed to assign passenger: ' + error.message);
    return data;
}

export async function removePassenger(passengerId: string): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase
        .from('mma_car_passengers')
        .delete()
        .eq('id', passengerId);

    if (error) throw new Error('Failed to remove passenger: ' + error.message);
}

export async function getUnassignedPassengers(eventId: string) {
    // This is complex - finding people who need transport but aren't assigned
    // Simpler approach: Get all needing transport, get all assigned, diff them
    
    const supabase = getClient();
    // 1. Get all enrollments for event with needs_transport != 'none'
    const { data: enrollments } = await supabase
        .from('mma_enrollments')
        .select(`
            id, 
            needs_transport, 
            status,
            person:mma_people(id, compiled_name, role),
            flights:mma_flights(*)
        `)
        .eq('event_id', eventId)
        .eq('status', 'active')
        .neq('needs_transport', 'none');
        
    // 2. Get all active assignments
    const { data: assignments } = await supabase
        .from('mma_car_passengers')
        .select('enrolled_id, transport_type')
        .in('enrolled_id', (enrollments || []).map(e => e.id));
        
    const assignedSet = new Set<string>();
    assignments?.forEach(a => assignedSet.add(`${a.enrolled_id}_${a.transport_type}`));
    
    // 3. Filter
    const unassigned: any[] = [];
    
    enrollments?.forEach((enr: any) => {
        const needsArrival = enr.needs_transport === 'arrival' || enr.needs_transport === 'both';
        const needsDeparture = enr.needs_transport === 'departure' || enr.needs_transport === 'both';
        
        // Find flight info
        const arrivalFlight = enr.flights?.find((f: any) => f.type === 'arrival_only' || f.type === 'full');
        const departureFlight = enr.flights?.find((f: any) => f.type === 'departure_only' || f.type === 'full');
        
        if (needsArrival && !assignedSet.has(`${enr.id}_arrival`)) {
            unassigned.push({
                enrollment: enr,
                type: 'arrival',
                flight: arrivalFlight
            });
        }
        
        if (needsDeparture && !assignedSet.has(`${enr.id}_departure`)) {
            unassigned.push({
                enrollment: enr,
                type: 'departure',
                flight: departureFlight
            });
        }
    });
    
    return unassigned;
}

export async function getTransportStats(eventId: string) {
  const supabase = getClient();
  // 1. Get cars stats
  const { data: cars, error: carsError } = await supabase
    .from('mma_event_cars')
    .select('id, capacity, passengers:mma_car_passengers(id)')
    .eq('event_id', eventId);

  if (carsError) throw new Error('Failed to fetch transport stats: ' + carsError.message);

  const totalCars = cars?.length || 0;
  const assignedCars = cars?.filter(c => c.passengers && c.passengers.length > 0).length || 0; 
  const totalCapacity = cars?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0;

  // 2. Get drivers stats
  const { data: drivers, error: driversError } = await supabase
    .from('mma_drivers')
    .select('is_active');
    
  if (driversError) throw new Error('Failed to fetch driver stats: ' + driversError.message);

  const totalDrivers = drivers?.length || 0;
  const activeDrivers = drivers?.filter(d => d.is_active).length || 0;

  return {
    total_cars: totalCars,
    total_drivers: totalDrivers,
    active_drivers: activeDrivers,
    assigned_cars: assignedCars,
    total_capacity: totalCapacity
  };
}

export async function getFlightGroups(eventId: string): Promise<import('@/types/transport').FlightGroup[]> {
  // TODO: Implement actual grouping logic
  return []; 
}
// ALIASES for backward compatibility or component consistency
export const addPassengerToCar = assignPassenger;
export const removePassengerFromCar = removePassenger;
export const getUnassignedPassengersForEvent = getUnassignedPassengers;
