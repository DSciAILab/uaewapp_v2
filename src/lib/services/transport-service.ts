import { createClient } from '@/lib/supabase/client';
import {
  Driver,
  DriverFormData,
  EventCar,
  EventCarFormData,
  CarPassenger,
  CarPassengerFormData,
  FlightGroup,
  TransportType,
  TransportStatsData,
  UnassignedPassenger,
} from '@/types/transport';

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

  return (data || []) as Driver[];
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

  return data as Driver;
}

export async function createDriver(formData: DriverFormData): Promise<Driver> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_drivers')
    .insert({
      full_name: formData.full_name,
      phone: formData.phone || null,
      is_active: formData.is_active,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create driver: ' + error.message);

  return data as Driver;
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

  return data as Driver;
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

/** Distinct passenger directions on a car. Derived — cars have no `type` column. */
function deriveTransportTypes(passengers: Array<{ transport_type?: string | null }>): TransportType[] {
  const seen = new Set<TransportType>();
  for (const p of passengers) {
    if (p.transport_type === 'arrival' || p.transport_type === 'departure') {
      seen.add(p.transport_type);
    }
  }
  return Array.from(seen).sort();
}

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
        )
      )
    `)
    .eq('event_id', eventId)
    .order('car_number');

  if (error) throw new Error('Failed to fetch event cars: ' + error.message);

  return ((data || []) as any[]).map((car) => {
    const passengers = (car.passengers || []).map((p: any) => ({
      ...p,
      enrolled: p.enrolled
        ? {
            ...p.enrolled,
            person: {
              ...p.enrolled.person,
              role: p.enrolled.role?.name || 'N/A',
            },
          }
        : null,
    }));

    return {
      ...car,
      passengers,
      transport_types: deriveTransportTypes(passengers),
    } as EventCar;
  });
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
    .maybeSingle();

  const nextCarNumber = (maxCar?.car_number || 0) + 1;

  const { data, error } = await supabase
    .from('mma_event_cars')
    .insert({
      event_id: eventId,
      driver_id: formData.driver_id || null,
      car_number: nextCarNumber,
      car_label: formData.car_label || null,
      capacity: formData.capacity ?? 4,
      vehicle_type: formData.vehicle_type || null,
      license_plate: formData.license_plate || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create car: ' + error.message);

  return data as EventCar;
}

export async function updateEventCar(carId: string, formData: Partial<EventCarFormData>): Promise<EventCar> {
  const supabase = getClient();
  // driver_id is a uuid column: '' from a cleared <Select> must become NULL.
  const patch: Record<string, unknown> = { ...formData };
  if ('driver_id' in patch) patch.driver_id = formData.driver_id || null;

  const { data, error } = await supabase
    .from('mma_event_cars')
    .update(patch)
    .eq('id', carId)
    .select()
    .single();

  if (error) throw new Error('Failed to update car: ' + error.message);

  return data as EventCar;
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
      transport_type: formData.transport_type,
      flight_id: formData.flight_id || null,
      pickup_location: formData.pickup_location || null,
      dropoff_location: formData.dropoff_location || null,
      pickup_time: formData.pickup_time || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to assign passenger: ' + error.message);
  return data as CarPassenger;
}

export async function removePassenger(passengerId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_car_passengers')
    .delete()
    .eq('id', passengerId);

  if (error) throw new Error('Failed to remove passenger: ' + error.message);
}

export async function getUnassignedPassengers(eventId: string): Promise<UnassignedPassenger[]> {
  const supabase = getClient();
  // 1. Get all enrollments for event with needs_transport != 'none'
  const { data: enrollments, error: enrollmentsError } = await supabase
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

  if (enrollmentsError) {
    throw new Error('Failed to fetch enrollments: ' + enrollmentsError.message);
  }

  const enrollmentRows = (enrollments || []) as any[];
  if (enrollmentRows.length === 0) return [];

  // 2. Existing assignments. transport_type now lives on the passenger row, so
  // no join to the car is needed to know the direction.
  const { data: assignments, error: assignmentsError } = await supabase
    .from('mma_car_passengers')
    .select('enrolled_id, transport_type')
    .in('enrolled_id', enrollmentRows.map((e) => e.id));

  if (assignmentsError) {
    throw new Error('Failed to fetch assignments: ' + assignmentsError.message);
  }

  const assignedSet = new Set<string>();
  ((assignments || []) as any[]).forEach((a) => {
    assignedSet.add(`${a.enrolled_id}_${a.transport_type}`);
  });

  // 3. Filter
  const unassigned: UnassignedPassenger[] = [];

  enrollmentRows.forEach((enr) => {
    const needs: TransportType[] = [];
    if (enr.needs_transport === 'arrival' || enr.needs_transport === 'both') needs.push('arrival');
    if (enr.needs_transport === 'departure' || enr.needs_transport === 'both') needs.push('departure');

    const flightFor = (type: TransportType) =>
      enr.flights?.find((f: any) =>
        type === 'arrival'
          ? f.type === 'arrival_only' || f.type === 'full'
          : f.type === 'departure_only' || f.type === 'full'
      );

    for (const type of needs) {
      if (assignedSet.has(`${enr.id}_${type}`)) continue;
      unassigned.push({
        enrolled_id: enr.id,
        person_name: enr.person?.compiled_name || 'Unknown',
        role: enr.role ? { name: enr.role.name } : null,
        transport_type: type,
        flight: flightFor(type) || null,
        enrollment: enr,
      });
    }
  });

  return unassigned;
}

export async function getTransportStats(eventId: string): Promise<TransportStatsData> {
  const supabase = getClient();
  // 1. Get cars stats
  const { data: cars, error: carsError } = await supabase
    .from('mma_event_cars')
    .select('id, capacity, passengers:mma_car_passengers(id)')
    .eq('event_id', eventId);

  if (carsError) throw new Error('Failed to fetch transport stats: ' + carsError.message);

  const carRows = (cars || []) as any[];
  const totalCars = carRows.length;
  const assignedCars = carRows.filter((c) => c.passengers && c.passengers.length > 0).length;
  // `capacity` is a real NOT NULL column now, so this is no longer hardcoded 0.
  const totalCapacity = carRows.reduce((sum, c) => sum + (c.capacity || 0), 0);

  // 2. Get drivers stats
  const { data: drivers, error: driversError } = await supabase
    .from('mma_drivers')
    .select('is_active');

  if (driversError) throw new Error('Failed to fetch driver stats: ' + driversError.message);

  const driverRows = (drivers || []) as any[];
  const totalDrivers = driverRows.length;
  const activeDrivers = driverRows.filter((d) => d.is_active).length;

  return {
    total_cars: totalCars,
    total_drivers: totalDrivers,
    active_drivers: activeDrivers,
    assigned_cars: assignedCars,
    total_capacity: totalCapacity,
  };
}

export async function getFlightGroups(eventId: string): Promise<FlightGroup[]> {
  const supabase = getClient();

  // 1. Get all flights for event
  const { data: flights, error: flightsError } = await supabase
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

  if (flightsError) throw new Error('Failed to fetch flights: ' + flightsError.message);
  if (!flights) return [];

  // 2. Get all car assignments for this event to cross-check
  const { data: cars, error: carsError } = await supabase
    .from('mma_event_cars')
    .select(`
      *,
      passengers:mma_car_passengers(
        id,
        enrolled_id,
        transport_type
      )
    `)
    .eq('event_id', eventId);

  if (carsError) throw new Error('Failed to fetch event cars: ' + carsError.message);

  const carRows = (cars || []) as any[];

  // Group passengers by flight number and datetime
  const groupsRaw: Record<string, FlightGroup> = {};

  (flights as any[]).forEach((f) => {
    const isArrival = f.type === 'arrival_only' || f.type === 'full';
    const isDeparture = f.type === 'departure_only' || f.type === 'full';

    const addToGroup = (type: TransportType) => {
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
            type,
          },
          passengers: [],
          unassigned_count: 0,
        };
      }

      // A car is direction-agnostic now: match on the PASSENGER's transport_type.
      const assignedCar = carRows.find((car) =>
        (car.passengers || []).some(
          (p: any) => p.enrolled_id === f.enrollment.id && p.transport_type === type
        )
      );

      groupsRaw[key].passengers.push({
        enrolled_id: f.enrollment.id,
        person_id: f.enrollment.person.id,
        person_name: f.enrollment.person.compiled_name,
        role: f.enrollment.role,
        assigned_car: assignedCar
          ? ({
              ...assignedCar,
              passengers: assignedCar.passengers,
              transport_types: deriveTransportTypes(assignedCar.passengers || []),
            } as EventCar)
          : undefined,
      });

      if (!assignedCar) {
        groupsRaw[key].unassigned_count++;
      }
    };

    if (isArrival) addToGroup('arrival');
    if (isDeparture) addToGroup('departure');
  });

  return Object.values(groupsRaw).sort(
    (a, b) => new Date(a.flight.datetime).getTime() - new Date(b.flight.datetime).getTime()
  );
}

// ALIASES for backward compatibility or component consistency
export const addPassengerToCar = assignPassenger;
export const removePassengerFromCar = removePassenger;
export const getUnassignedPassengersForEvent = getUnassignedPassengers;

// ==================== CSV IMPORT ====================

// `name` here is the CSV column header (user-facing), mapped to mma_drivers.full_name on write.
export interface DriverCSVRow {
  name: string
  phone?: string
  is_active?: string
  notes?: string
}

export interface DriverImportError {
  row: number
  name: string
  message: string
}

export async function importDriversFromCSV(
  rows: DriverCSVRow[],
  upsertMode: boolean = true,
  onProgress?: (current: number, total: number, message?: string) => void
): Promise<{ created: number; updated: number; skipped: DriverImportError[]; errors: DriverImportError[] }> {
  const supabase = getClient()
  const errors: DriverImportError[] = []
  const skipped: DriverImportError[] = []
  let created = 0
  let updated = 0
  const total = rows.length

  if (onProgress) onProgress(0, total, 'Buscando motoristas...')
  const { data: existing } = await supabase.from('mma_drivers').select('id, full_name')
  const nameIdMap = new Map<string, string>()
  for (const d of ((existing || []) as any[])) nameIdMap.set(d.full_name.toLowerCase().trim(), d.id)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    if (onProgress && i % 5 === 0) onProgress(i, total, `Processando ${rowNum} de ${total}...`)

    const name = (row.name || '').trim()
    if (!name) { errors.push({ row: rowNum, name: '(vazio)', message: 'Nome é obrigatório' }); continue }

    const existingId = nameIdMap.get(name.toLowerCase())
    const isActive = row.is_active ? row.is_active.toLowerCase() === 'true' || row.is_active === '1' : true

    if (existingId) {
      if (upsertMode) {
        const { error: err } = await supabase.from('mma_drivers').update({
          phone: row.phone || null, is_active: isActive, notes: row.notes || null
        }).eq('id', existingId)
        if (err) errors.push({ row: rowNum, name, message: err.message })
        else updated++
      } else {
        skipped.push({ row: rowNum, name, message: 'Motorista já existe' })
      }
    } else {
      const { error: err } = await supabase.from('mma_drivers').insert({
        full_name: name, phone: row.phone || null, is_active: isActive, notes: row.notes || null
      })
      if (err) errors.push({ row: rowNum, name, message: err.message })
      else { created++; nameIdMap.set(name.toLowerCase(), 'new') }
    }
  }

  if (onProgress) onProgress(total, total, 'Concluído!')
  return { created, updated, skipped, errors }
}
