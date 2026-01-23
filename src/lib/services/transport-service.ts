import { createClient } from '@/lib/supabase/client';
import { Driver, DriverFormData, EventCar, EventCarFormData, CarPassenger, CarPassengerFormData, FlightGroup } from '@/types/transport';

const supabase = createClient();

// ==================== DRIVERS ====================

export async function getDrivers(activeOnly: boolean = false): Promise<Driver[]> {
  let query = supabase.from('mma_drivers').select('*').order('full_name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch drivers');

  return data || [];
}

export async function getDriverById(driverId: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('mma_drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createDriver(formData: DriverFormData): Promise<Driver> {
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

  if (error) throw new Error('Failed to create driver');

  return data;
}

export async function updateDriver(driverId: string, formData: Partial<DriverFormData>): Promise<Driver> {
  const { data, error } = await supabase
    .from('mma_drivers')
    .update(formData)
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw new Error('Failed to update driver');

  return data;
}

export async function deactivateDriver(driverId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_drivers')
    .update({ is_active: false })
    .eq('id', driverId);

  if (error) throw new Error('Failed to deactivate driver');
}

// ==================== EVENT CARS ====================

export async function getEventCars(eventId: string): Promise<EventCar[]> {
  const { data, error } = await supabase
    .from('mma_event_cars')
    .select(`
      *,
      driver:mma_drivers(*),
      passengers:mma_car_passengers(
        *,
        enrolled:mma_enrollments(id, person:mma_people(id, compiled_name, role)),
        flight:mma_flights(id, flight_number, arrival_datetime, departure_datetime)
      )
    `)
    .eq('event_id', eventId)
    .order('car_number');

  if (error) throw new Error('Failed to fetch event cars');

  // Mapping compiled_name to full_name for type compatibility
  return (data || []).map((car: any) => ({
    ...car,
    passengers: (car.passengers || []).map((p: any) => {
      const person = Array.isArray(p.enrolled.person) ? p.enrolled.person[0] : p.enrolled.person;
      return {
        ...p,
        enrolled: {
          ...p.enrolled,
          person: {
            ...person,
            full_name: person.compiled_name
          }
        }
      };
    })
  })) as EventCar[];
}

export async function getCarById(carId: string): Promise<EventCar | null> {
  const { data, error } = await supabase
    .from('mma_event_cars')
    .select(`
      *,
      driver:mma_drivers(*),
      passengers:mma_car_passengers(
        *,
        enrolled:mma_enrollments(id, person:mma_people(id, compiled_name, role)),
        flight:mma_flights(id, flight_number, arrival_datetime, departure_datetime)
      )
    `)
    .eq('id', carId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    passengers: (data.passengers || []).map((p: any) => {
      const person = Array.isArray(p.enrolled.person) ? p.enrolled.person[0] : p.enrolled.person;
      return {
        ...p,
        enrolled: {
          ...p.enrolled,
          person: {
            ...person,
            full_name: person.compiled_name
          }
        }
      };
    })
  } as EventCar;
}

async function getNextCarNumber(eventId: string): Promise<number> {
  const { data, error } = await supabase
    .from('mma_event_cars')
    .select('car_number')
    .eq('event_id', eventId)
    .order('car_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  return (data?.[0]?.car_number || 0) + 1;
}

export async function createEventCar(eventId: string, formData: EventCarFormData): Promise<EventCar> {
  const carNumber = await getNextCarNumber(eventId);

  const { data, error } = await supabase
    .from('mma_event_cars')
    .insert({
      event_id: eventId,
      driver_id: formData.driver_id || null,
      car_number: carNumber,
      car_label: formData.car_label || `CAR ${carNumber}`,
      capacity: formData.capacity,
      vehicle_type: formData.vehicle_type || null,
      license_plate: formData.license_plate || null,
      notes: formData.notes || null
    })
    .select(`*, driver:mma_drivers(*)`)
    .single();

  if (error) throw new Error('Failed to create event car');

  return data;
}

export async function updateEventCar(carId: string, formData: Partial<EventCarFormData>): Promise<EventCar> {
  const { data, error } = await supabase
    .from('mma_event_cars')
    .update(formData)
    .eq('id', carId)
    .select(`*, driver:mma_drivers(*)`)
    .single();

  if (error) throw new Error('Failed to update event car');

  return data;
}

export async function deleteEventCar(carId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_event_cars')
    .delete()
    .eq('id', carId);

  if (error) throw new Error('Failed to delete event car');
}

// ==================== PASSENGERS ====================

export async function addPassengerToCar(carId: string, formData: CarPassengerFormData): Promise<CarPassenger> {
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
    .select(`
      *,
      enrolled:mma_enrollments(id, person:mma_people(id, compiled_name, role)),
      flight:mma_flights(id, flight_number, arrival_datetime, departure_datetime)
    `)
    .single();

  if (error) throw new Error('Failed to add passenger to car: ' + error.message);

  const person = Array.isArray(data.enrolled.person) ? data.enrolled.person[0] : data.enrolled.person;
  return {
    ...data,
    enrolled: {
      ...data.enrolled,
      person: {
        ...person,
        full_name: person.compiled_name
      }
    }
  } as CarPassenger;
}

export async function removePassengerFromCar(passengerId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_car_passengers')
    .delete()
    .eq('id', passengerId);

  if (error) throw new Error('Failed to remove passenger from car');
}

export async function movePassengerToCar(passengerId: string, newCarId: string): Promise<CarPassenger> {
  const { data, error } = await supabase
    .from('mma_car_passengers')
    .update({ car_id: newCarId })
    .eq('id', passengerId)
    .select()
    .single();

  if (error) throw new Error('Failed to move passenger');

  return data;
}

// ==================== FLIGHT GROUPING ====================

export async function getFlightGroups(eventId: string): Promise<{
  arrivals: FlightGroup[];
  departures: FlightGroup[];
}> {
  const { data: flights, error: flightsError } = await supabase
    .from('mma_flights')
    .select('*')
    .eq('event_id', eventId);

  if (flightsError) throw flightsError;

  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      arrival_flight_id,
      departure_flight_id,
      person:mma_people!inner(id, compiled_name, role),
      car_passengers:mma_car_passengers(id, transport_type, car:mma_event_cars(id, car_number, car_label))
    `)
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  const arrivalGroups: Map<string, FlightGroup> = new Map();
  const departureGroups: Map<string, FlightGroup> = new Map();

  for (const e of enrolled || []) {
    if (e.arrival_flight_id) {
      const flight = flights?.find(f => f.id === e.arrival_flight_id);
      if (flight) {
        if (!arrivalGroups.has(flight.id)) {
          arrivalGroups.set(flight.id, {
            flight: { id: flight.id, flight_number: flight.flight_number, datetime: flight.arrival_datetime, type: 'arrival' },
            passengers: [],
            unassigned_count: 0
          });
        }

        const group = arrivalGroups.get(flight.id)!;
        const arrivalAssignment = e.car_passengers?.find((cp: any) => cp.transport_type === 'arrival');

        const person = Array.isArray(e.person) ? e.person[0] : e.person;
        const car = arrivalAssignment?.car;
        const assignedCar = Array.isArray(car) ? car[0] : car;

        group.passengers.push({
          enrolled_id: e.id,
          person_name: person.compiled_name,
          role: person.role,
          assigned_car: assignedCar || undefined
        });

        if (!arrivalAssignment) {
          group.unassigned_count++;
        }
      }
    }

    if (e.departure_flight_id) {
      const flight = flights?.find(f => f.id === e.departure_flight_id);
      if (flight) {
        if (!departureGroups.has(flight.id)) {
          departureGroups.set(flight.id, {
            flight: { id: flight.id, flight_number: flight.flight_number, datetime: flight.departure_datetime, type: 'departure' },
            passengers: [],
            unassigned_count: 0
          });
        }

        const group = departureGroups.get(flight.id)!;
        const departureAssignment = e.car_passengers?.find((cp: any) => cp.transport_type === 'departure');

        const person = Array.isArray(e.person) ? e.person[0] : e.person;
        const car = departureAssignment?.car;
        const assignedCar = Array.isArray(car) ? car[0] : car;

        group.passengers.push({
          enrolled_id: e.id,
          person_name: person.compiled_name,
          role: person.role,
          assigned_car: assignedCar || undefined
        });

        if (!departureAssignment) {
          group.unassigned_count++;
        }
      }
    }
  }

  const sortByDatetime = (a: FlightGroup, b: FlightGroup) =>
    new Date(a.flight.datetime).getTime() - new Date(b.flight.datetime).getTime();

  return {
    arrivals: Array.from(arrivalGroups.values()).sort(sortByDatetime),
    departures: Array.from(departureGroups.values()).sort(sortByDatetime)
  };
}

export async function getUnassignedPassengers(
  eventId: string,
  flightId: string,
  transportType: 'arrival' | 'departure'
): Promise<Array<{ enrolled_id: string; person_name: string; role: string }>> {
  const flightColumn = transportType === 'arrival' ? 'arrival_flight_id' : 'departure_flight_id';

  const { data: enrolled, error } = await supabase
    .from('mma_enrollments')
    .select(`id, person:mma_people!inner(id, compiled_name, role)`)
    .eq('event_id', eventId)
    .eq(flightColumn, flightId);

  if (error) throw error;

  const { data: assigned, error: assignedError } = await supabase
    .from('mma_car_passengers')
    .select('enrolled_id')
    .eq('transport_type', transportType)
    .eq('flight_id', flightId);

  if (assignedError) throw assignedError;

  const assignedIds = new Set(assigned?.map(a => a.enrolled_id) || []);

  return (enrolled || [])
    .filter(e => !assignedIds.has(e.id))
    .map(e => {
      const person = Array.isArray(e.person) ? e.person[0] : e.person;
      return { enrolled_id: e.id, person_name: person.compiled_name, role: person.role };
    });
}

export async function getUnassignedPassengersForEvent(
  eventId: string,
  transportType: 'arrival' | 'departure'
): Promise<Array<{ enrolled_id: string; person_name: string; role: string; flight_id?: string }>> {
  const flightColumn = transportType === 'arrival' ? 'arrival_flight_id' : 'departure_flight_id';

  const { data: enrolled, error } = await supabase
    .from('mma_enrollments')
    .select(`
      id, 
      ${flightColumn},
      needs_transport,
      person:mma_people!inner(id, compiled_name, role)
    `)
    .eq('event_id', eventId)
    .or(`${flightColumn}.not.is.null,needs_transport.eq.${transportType},needs_transport.eq.both`);

  if (error) throw error;

  const { data: assigned, error: assignedError } = await supabase
    .from('mma_car_passengers')
    .select('enrolled_id')
    .eq('transport_type', transportType);

  if (assignedError) throw assignedError;

  const assignedIds = new Set(assigned?.map(a => a.enrolled_id) || []);

  return (enrolled || [])
    .filter(e => !assignedIds.has(e.id))
    .map((e: any) => {
      const person = Array.isArray(e.person) ? e.person[0] : e.person;
      return { 
        enrolled_id: e.id, 
        person_name: person.compiled_name, 
        role: person.role,
        flight_id: e[flightColumn]
      };
    });
}

export async function getTransportStats(eventId: string): Promise<{
  total_cars: number;
  total_capacity: number;
  assigned_arrivals: number;
  assigned_departures: number;
  unassigned_arrivals: number;
  unassigned_departures: number;
}> {
  const { data: cars, error: carsError } = await supabase
    .from('mma_event_cars')
    .select('capacity')
    .eq('event_id', eventId);

  if (carsError) throw carsError;

  const groups = await getFlightGroups(eventId);

  const assignedArrivals = groups.arrivals.reduce((sum, g) => sum + g.passengers.filter(p => p.assigned_car).length, 0);
  const unassignedArrivals = groups.arrivals.reduce((sum, g) => sum + g.unassigned_count, 0);
  const assignedDepartures = groups.departures.reduce((sum, g) => sum + g.passengers.filter(p => p.assigned_car).length, 0);
  const unassignedDepartures = groups.departures.reduce((sum, g) => sum + g.unassigned_count, 0);

  return {
    total_cars: cars?.length || 0,
    total_capacity: cars?.reduce((sum, c) => sum + c.capacity, 0) || 0,
    assigned_arrivals: assignedArrivals,
    assigned_departures: assignedDepartures,
    unassigned_arrivals: unassignedArrivals,
    unassigned_departures: unassignedDepartures
  };
}
