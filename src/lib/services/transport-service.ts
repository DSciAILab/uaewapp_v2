import { createClient } from '@/lib/supabase/client';
import { Driver, DriverFormData, EventCar, EventCarFormData, CarPassenger, CarPassengerFormData } from '@/types/transport';

const getClient = () => createClient();

// ==================== DRIVERS ====================

export async function getDrivers(activeOnly: boolean = false): Promise<Driver[]> {
  const supabase = getClient();
  let query = supabase.from('mma_transport_drivers').select('*').order('name');

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
    .from('mma_transport_drivers')
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
    .from('mma_transport_drivers')
    .insert({
      name: formData.name,
      phone: formData.phone || null,
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
    .from('mma_transport_drivers')
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
    .from('mma_transport_drivers')
    .update({ is_active: false })
    .eq('id', driverId);

  if (error) throw new Error('Failed to deactivate driver: ' + error.message);
}

// ==================== EVENT CARS ====================

export async function getEventCars(eventId: string): Promise<EventCar[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_transport_cars')
    .select(`
      *,
      driver:mma_transport_drivers(*),
      passengers:mma_transport_passengers(
        *,
        enrolled:mma_enrollments(
            id, 
            person:mma_people(id, compiled_name),
            role:mma_roles(name)
        )
      )
    `)
    .eq('event_id', eventId)
    .order('car_number');

  if (error) throw new Error('Failed to fetch event cars: ' + error.message);
  
  return (data || []).map((car: any) => ({
      ...car,
      passengers: (car.passengers || []).map((p: any) => ({
          ...p,
          enrolled: p.enrolled ? {
            ...p.enrolled,
            person: {
                ...p.enrolled.person,
                role: p.enrolled.role?.name || 'N/A'
            }
          } : null
      }))
  }));
}

export async function createEventCar(eventId: string, formData: EventCarFormData): Promise<EventCar> {
  const supabase = getClient();
  // Get max car number for auto-increment
  const { data: maxCar } = await supabase
    .from('mma_transport_cars')
    .select('car_number')
    .eq('event_id', eventId)
    .order('car_number', { ascending: false })
    .limit(1)
    .single();

  const nextCarNumber = (maxCar?.car_number || 0) + 1;

  const { data, error } = await supabase
    .from('mma_transport_cars')
    .insert({
      event_id: eventId,
      driver_id: formData.driver_id || null,
      car_number: nextCarNumber,
      type: formData.type,
      vehicle_type: formData.vehicle_type || null,
      flight_number: formData.flight_number || null,
      flight_date: formData.flight_date || null,
      flight_time: formData.flight_time || null,
      airport: formData.airport || null,
      route_from: formData.route_from || null,
      route_to: formData.route_to || null,
      scheduled_date: formData.scheduled_date || null,
      scheduled_time: formData.scheduled_time || null,
      status: formData.status || 'scheduled',
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
    .from('mma_transport_cars')
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
    .from('mma_transport_cars')
    .delete()
    .eq('id', carId);

  if (error) throw new Error('Failed to delete car: ' + error.message);
}

// ==================== PASSENGERS ====================

export async function assignPassenger(carId: string, formData: CarPassengerFormData): Promise<CarPassenger> {
    const supabase = getClient();
    const { data, error } = await supabase
        .from('mma_transport_passengers')
        .insert({
            car_id: carId,
            enrollment_id: formData.enrollment_id
        })
        .select()
        .single();
    
    if (error) throw new Error('Failed to assign passenger: ' + error.message);
    return data;
}

export async function removePassenger(passengerId: string): Promise<void> {
    const supabase = getClient();
    const { error } = await supabase
        .from('mma_transport_passengers')
        .delete()
        .eq('id', passengerId);

    if (error) throw new Error('Failed to remove passenger: ' + error.message);
}

export async function getUnassignedPassengers(eventId: string) {
    const supabase = getClient();
    // 1. Get all enrollments for event with needs_transport != 'none'
    const { data: enrollments } = await supabase
        .from('mma_enrollments')
        .select(`
            id, 
            needs_transport, 
            status,
            person:mma_people(id, compiled_name),
            role:mma_roles(*),
            flights:mma_flights(*)
        `)
        .eq('event_id', eventId)
        .eq('status', 'active')
        .neq('needs_transport', 'none');
        
    // 2. Get all active assignments joined with car info to know transport type
    const { data: assignments } = await supabase
        .from('mma_transport_passengers')
        .select(`
            enrollment_id,
            car:mma_transport_cars(type)
        `)
        .in('enrollment_id', (enrollments || []).map((e: any) => e.id));
        
    const assignedSet = new Set<string>();
    assignments?.forEach((a: any) => {
        if (a.car?.type) {
            assignedSet.add(`${a.enrollment_id}_${a.car.type}`);
        }
    });
    
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
    .from('mma_transport_cars')
    .select('id, passengers:mma_transport_passengers(id)')
    .eq('event_id', eventId);

  if (carsError) throw new Error('Failed to fetch transport stats: ' + carsError.message);

  const totalCars = cars?.length || 0;
  const assignedCars = cars?.filter((c: any) => c.passengers && c.passengers.length > 0).length || 0; 

  // 2. Get drivers stats
  const { data: drivers, error: driversError } = await supabase
    .from('mma_transport_drivers')
    .select('is_active');
    
  if (driversError) throw new Error('Failed to fetch driver stats: ' + driversError.message);

  const totalDrivers = drivers?.length || 0;
  const activeDrivers = drivers?.filter((d: any) => d.is_active).length || 0;

  return {
    total_cars: totalCars,
    total_drivers: totalDrivers,
    active_drivers: activeDrivers,
    assigned_cars: assignedCars
  };
}

export async function getFlightGroups(eventId: string): Promise<import('@/types/transport').FlightGroup[]> {
  const supabase = getClient();
  
  // 1. Get all flights for event
  const { data: flights } = await supabase
    .from('mma_flights')
    .select(`
      id,
      type,
      arrival_flight_number,
      arrival_date,
      arrival_time,
      departure_flight_number,
      departure_date,
      departure_time,
      enrollment:mma_enrollments!inner(
        id,
        event_id,
        person:mma_people(id, compiled_name),
        role:mma_roles(name)
      )
    `)
    .eq('enrollment.event_id', eventId);

  if (!flights) return [];

  // 2. Get all car assignments for this event to cross-check
  const { data: cars } = await supabase
    .from('mma_transport_cars')
    .select(`
      *,
      passengers:mma_transport_passengers(
        id,
        enrollment_id
      )
    `)
    .eq('event_id', eventId);

  // Group passengers by flight number and datetime
  const groupsRaw: Record<string, import('@/types/transport').FlightGroup> = {};

  flights.forEach((f: any) => {
    const isArrival = f.type === 'arrival_only' || f.type === 'full';
    const isDeparture = f.type === 'departure_only' || f.type === 'full';

    // Helper for adding to groups
    const addToGroup = (type: 'arrival' | 'departure') => {
      const flightNum = type === 'arrival' ? f.arrival_flight_number : f.departure_flight_number;
      const date = type === 'arrival' ? f.arrival_date : f.departure_date;
      const time = type === 'arrival' ? f.arrival_time : f.departure_time;
      
      if (!flightNum) return;

      const key = `${type}_${flightNum}_${date}_${time}`;
      
      if (!groupsRaw[key]) {
        groupsRaw[key] = {
          flight: {
            id: f.id + '_' + type, // Synthetic ID for UI grouping
            flight_number: flightNum,
            datetime: date ? `${date}T${time || '00:00:00'}` : '',
            type
          },
          passengers: [],
          unassigned_count: 0
        };
      }

      // Check if this specific enrollment is assigned to a car of this type
      const assignedCar = cars?.find((car: any) => 
        car.type === type && 
        car.passengers.some((p: any) => p.enrollment_id === f.enrollment.id)
      );

      groupsRaw[key].passengers.push({
        enrolled_id: f.enrollment.id,
        person_id: f.enrollment.person.id,
        person_name: f.enrollment.person.compiled_name,
        role: f.enrollment.role,
        assigned_car: assignedCar ? {
          ...assignedCar,
          passengers: assignedCar.passengers // We don't need the full passenger list here usually but just in case
        } : undefined
      });

      if (!assignedCar) {
        groupsRaw[key].unassigned_count++;
      }
    };

    if (isArrival) addToGroup('arrival');
    if (isDeparture) addToGroup('departure');
  });

  return Object.values(groupsRaw).sort((a, b) => 
    new Date(a.flight.datetime).getTime() - new Date(b.flight.datetime).getTime()
  );
}

// ALIASES for backward compatibility or component consistency
export const addPassengerToCar = assignPassenger;
export const removePassengerFromCar = removePassenger;
export const getUnassignedPassengersForEvent = getUnassignedPassengers;
