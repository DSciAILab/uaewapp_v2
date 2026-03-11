# SPRINT 05: Hotels + Transport Module

## 📋 Sprint Overview

**Sprint**: 05 - Hotels + Transport
**Duration**: 3-4 days
**Dependencies**: Sprint 02 (Events + Enrolled), Sprint 03 (Flights)
**Objective**: Implement hotel reservation management with divergence detection/approval and transport logistics with driver/car management grouped by flights

---

## 🎯 Sprint Goals

1. **Hotels Module**
   - CRUD for hotel reservations linked to enrolled participants
   - Automatic check-in/out calculation based on flight times
   - Divergence detection (pre-booking, early check-in, late checkout)
   - Approval workflow for divergences
   - Reservation status management

2. **Transport Module**
   - Global drivers management (not event-specific)
   - Car assignment per event with automatic numbering
   - Passenger grouping by flight arrival/departure
   - Driver-car-passenger relationship management

---

## 📁 Files to Create

```
src/
├── lib/
│   ├── services/
│   │   ├── hotel-service.ts
│   │   └── transport-service.ts
│   └── utils/
│       └── hotel-calculations.ts
├── components/
│   ├── hotels/
│   │   ├── hotel-form.tsx
│   │   ├── hotel-table.tsx
│   │   ├── hotel-divergence-badge.tsx
│   │   ├── hotel-approval-dialog.tsx
│   │   └── hotel-filters.tsx
│   └── transport/
│       ├── driver-form.tsx
│       ├── driver-table.tsx
│       ├── car-form.tsx
│       ├── car-table.tsx
│       ├── passenger-assignment.tsx
│       └── flight-grouping-view.tsx
├── app/
│   └── (dashboard)/
│       └── events/
│           └── [eventId]/
│               ├── hotels/
│               │   └── page.tsx
│               └── transport/
│                   └── page.tsx
└── types/
    ├── hotel.ts
    └── transport.ts
```

---

## 📝 Type Definitions

### File: `src/types/hotel.ts`

```typescript
// Hotel reservation status
export type HotelStatus = 'pending' | 'confirmed' | 'cancelled';

// Divergence types
export type DivergenceType = 'pre_booking' | 'early_checkin' | 'late_checkout';

export interface Hotel {
  id: string;
  enrolled_id: string;
  event_id: string;
  hotel_name: string;
  room_type: string | null;
  
  // Calculated dates (based on flights + event margins)
  calculated_checkin: string;
  calculated_checkout: string;
  
  // Actual dates (may differ, creating divergences)
  actual_checkin: string;
  actual_checkout: string;
  
  // Divergence tracking
  has_divergence: boolean;
  divergence_type: DivergenceType | null;
  divergence_reason: string | null;
  divergence_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  
  // Booking info
  confirmation_number: string | null;
  status: HotelStatus;
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
      role: string;
    };
    arrival_flight?: {
      arrival_datetime: string;
    };
    departure_flight?: {
      departure_datetime: string;
    };
  };
}

export interface HotelFormData {
  enrolled_id: string;
  hotel_name: string;
  room_type?: string;
  actual_checkin: string;
  actual_checkout: string;
  confirmation_number?: string;
  status: HotelStatus;
  notes?: string;
  divergence_reason?: string;
}

export interface HotelDivergence {
  type: DivergenceType;
  description: string;
  days_difference: number;
}

export interface HotelFilters {
  status?: HotelStatus;
  has_divergence?: boolean;
  divergence_approved?: boolean;
  hotel_name?: string;
  search?: string;
}
```

### File: `src/types/transport.ts`

```typescript
export interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  vehicle_info: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverFormData {
  full_name: string;
  phone?: string;
  email?: string;
  license_number?: string;
  vehicle_info?: string;
  is_active: boolean;
  notes?: string;
}

export interface EventCar {
  id: string;
  event_id: string;
  driver_id: string | null;
  car_number: number; // Auto-incremented per event
  car_label: string | null; // e.g., "VAN 1", "SUV 2"
  capacity: number;
  vehicle_type: string | null; // sedan, suv, van, bus
  license_plate: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  driver?: Driver;
  passengers?: CarPassenger[];
}

export interface EventCarFormData {
  driver_id?: string;
  car_label?: string;
  capacity: number;
  vehicle_type?: string;
  license_plate?: string;
  notes?: string;
}

export interface CarPassenger {
  id: string;
  car_id: string;
  enrolled_id: string;
  flight_id: string | null; // Which flight this transport is for
  transport_type: 'arrival' | 'departure';
  pickup_location: string | null;
  dropoff_location: string | null;
  pickup_time: string | null;
  notes: string | null;
  created_at: string;
  
  // Joined data
  enrolled?: {
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
  flight?: {
    id: string;
    flight_number: string;
    arrival_datetime: string | null;
    departure_datetime: string | null;
  };
}

export interface CarPassengerFormData {
  enrolled_id: string;
  flight_id?: string;
  transport_type: 'arrival' | 'departure';
  pickup_location?: string;
  dropoff_location?: string;
  pickup_time?: string;
  notes?: string;
}

export interface FlightGroup {
  flight: {
    id: string;
    flight_number: string;
    datetime: string;
    type: 'arrival' | 'departure';
  };
  passengers: Array<{
    enrolled_id: string;
    person_name: string;
    role: string;
    assigned_car?: EventCar;
  }>;
  unassigned_count: number;
}
```

---

## 🔧 Hotel Calculations Utility

### File: `src/lib/utils/hotel-calculations.ts`

```typescript
import { differenceInDays, parseISO, format, subDays, addDays } from 'date-fns';
import { HotelDivergence, DivergenceType } from '@/types/hotel';

interface FlightDates {
  arrival_datetime: string | null;
  departure_datetime: string | null;
}

interface EventMargins {
  checkin_days_before: number;
  checkout_days_after: number;
}

interface CalculatedDates {
  checkin: Date;
  checkout: Date;
}

export function calculateHotelDates(
  flights: FlightDates,
  eventStartDate: string,
  eventEndDate: string,
  margins: EventMargins = { checkin_days_before: 1, checkout_days_after: 1 }
): CalculatedDates {
  let checkin: Date;
  let checkout: Date;
  
  if (flights.arrival_datetime) {
    checkin = parseISO(flights.arrival_datetime);
  } else {
    checkin = subDays(parseISO(eventStartDate), margins.checkin_days_before);
  }
  
  if (flights.departure_datetime) {
    checkout = parseISO(flights.departure_datetime);
  } else {
    checkout = addDays(parseISO(eventEndDate), margins.checkout_days_after);
  }
  
  return { checkin, checkout };
}

export function detectDivergences(
  calculatedCheckin: Date,
  calculatedCheckout: Date,
  actualCheckin: string,
  actualCheckout: string
): HotelDivergence[] {
  const divergences: HotelDivergence[] = [];
  const actualCheckinDate = parseISO(actualCheckin);
  const actualCheckoutDate = parseISO(actualCheckout);
  
  const checkinDiff = differenceInDays(calculatedCheckin, actualCheckinDate);
  if (checkinDiff > 0) {
    divergences.push({
      type: 'pre_booking',
      description: `Check-in ${checkinDiff} day(s) earlier than expected`,
      days_difference: checkinDiff
    });
  }
  
  const checkoutDiff = differenceInDays(actualCheckoutDate, calculatedCheckout);
  if (checkoutDiff > 0) {
    divergences.push({
      type: 'late_checkout',
      description: `Check-out ${checkoutDiff} day(s) later than expected`,
      days_difference: checkoutDiff
    });
  }
  
  return divergences;
}

export function getPrimaryDivergence(divergences: HotelDivergence[]): DivergenceType | null {
  if (divergences.length === 0) return null;
  
  const priority: DivergenceType[] = ['pre_booking', 'late_checkout', 'early_checkin'];
  
  for (const type of priority) {
    const found = divergences.find(d => d.type === type);
    if (found) return found.type;
  }
  
  return divergences[0].type;
}

export function formatDivergenceLabel(type: DivergenceType): string {
  const labels: Record<DivergenceType, string> = {
    pre_booking: 'Pre-Booking',
    early_checkin: 'Early Check-in',
    late_checkout: 'Late Checkout'
  };
  return labels[type];
}

export function calculateNights(checkin: string, checkout: string): number {
  return differenceInDays(parseISO(checkout), parseISO(checkin));
}
```

---

## 🔧 Hotel Service

### File: `src/lib/services/hotel-service.ts`

```typescript
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
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role),
        arrival_flight:mma_flights!mma_enrolled_arrival_flight_id_fkey(id, flight_number, arrival_datetime),
        departure_flight:mma_flights!mma_enrolled_departure_flight_id_fkey(id, flight_number, departure_datetime)
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
  if (error) throw new Error('Failed to fetch hotel reservations');

  let results = data as Hotel[];
  
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
      enrolled:mma_enrolled!inner(
        id,
        person:mma_people!inner(id, full_name, role),
        arrival_flight:mma_flights!mma_enrolled_arrival_flight_id_fkey(arrival_datetime),
        departure_flight:mma_flights!mma_enrolled_departure_flight_id_fkey(departure_datetime)
      )
    `)
    .eq('id', hotelId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch hotel reservation');
  }

  return data as Hotel;
}

export async function getHotelByEnrolledId(enrolledId: string): Promise<Hotel | null> {
  const { data, error } = await supabase
    .from('mma_hotels')
    .select('*')
    .eq('enrolled_id', enrolledId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createHotel(
  eventId: string,
  formData: HotelFormData,
  eventDates: { start_date: string; end_date: string }
): Promise<Hotel> {
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select(`
      id,
      arrival_flight:mma_flights!mma_enrolled_arrival_flight_id_fkey(arrival_datetime),
      departure_flight:mma_flights!mma_enrolled_departure_flight_id_fkey(departure_datetime)
    `)
    .eq('id', formData.enrolled_id)
    .single();

  if (enrolledError) throw new Error('Failed to fetch enrolled data');

  const calculated = calculateHotelDates(
    {
      arrival_datetime: enrolled.arrival_flight?.arrival_datetime || null,
      departure_datetime: enrolled.departure_flight?.departure_datetime || null
    },
    eventDates.start_date,
    eventDates.end_date
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

  if (error) throw new Error('Failed to create hotel reservation');

  return data;
}

export async function updateHotel(
  hotelId: string,
  formData: Partial<HotelFormData>,
  eventDates?: { start_date: string; end_date: string }
): Promise<Hotel> {
  let updateData: Record<string, unknown> = { ...formData };

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

  if (error) throw new Error('Failed to update hotel reservation');

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
  person: { id: string; full_name: string; role: string };
}>> {
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select(`id, person:mma_people!inner(id, full_name, role)`)
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  const { data: hotels, error: hotelsError } = await supabase
    .from('mma_hotels')
    .select('enrolled_id')
    .eq('event_id', eventId);

  if (hotelsError) throw hotelsError;

  const hotelEnrolledIds = new Set(hotels?.map(h => h.enrolled_id) || []);

  return (enrolled || []).filter(e => !hotelEnrolledIds.has(e.id));
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
```

---

## 🔧 Transport Service

### File: `src/lib/services/transport-service.ts`

```typescript
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
        enrolled:mma_enrolled(id, person:mma_people(id, full_name, role)),
        flight:mma_flights(id, flight_number, arrival_datetime, departure_datetime)
      )
    `)
    .eq('event_id', eventId)
    .order('car_number');

  if (error) throw new Error('Failed to fetch event cars');

  return data || [];
}

export async function getCarById(carId: string): Promise<EventCar | null> {
  const { data, error } = await supabase
    .from('mma_event_cars')
    .select(`
      *,
      driver:mma_drivers(*),
      passengers:mma_car_passengers(
        *,
        enrolled:mma_enrolled(id, person:mma_people(id, full_name, role)),
        flight:mma_flights(id, flight_number, arrival_datetime, departure_datetime)
      )
    `)
    .eq('id', carId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
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
      enrolled:mma_enrolled(id, person:mma_people(id, full_name, role)),
      flight:mma_flights(id, flight_number, arrival_datetime, departure_datetime)
    `)
    .single();

  if (error) throw new Error('Failed to add passenger to car');

  return data;
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
    .from('mma_enrolled')
    .select(`
      id,
      arrival_flight_id,
      departure_flight_id,
      person:mma_people!inner(id, full_name, role),
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

        group.passengers.push({
          enrolled_id: e.id,
          person_name: e.person.full_name,
          role: e.person.role,
          assigned_car: arrivalAssignment?.car || undefined
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

        group.passengers.push({
          enrolled_id: e.id,
          person_name: e.person.full_name,
          role: e.person.role,
          assigned_car: departureAssignment?.car || undefined
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
    .from('mma_enrolled')
    .select(`id, person:mma_people!inner(id, full_name, role)`)
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
    .map(e => ({ enrolled_id: e.id, person_name: e.person.full_name, role: e.person.role }));
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
```

---

## 🎨 Hotel Components

### File: `src/components/hotels/hotel-divergence-badge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { DivergenceType } from '@/types/hotel';
import { formatDivergenceLabel } from '@/lib/utils/hotel-calculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HotelDivergenceBadgeProps {
  divergenceType: DivergenceType;
  isApproved: boolean;
  reason?: string | null;
}

const divergenceConfig: Record<DivergenceType, { icon: typeof AlertTriangle; color: string; approvedColor: string }> = {
  pre_booking: {
    icon: Calendar,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    approvedColor: 'bg-green-100 text-green-800 border-green-200'
  },
  early_checkin: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approvedColor: 'bg-green-100 text-green-800 border-green-200'
  },
  late_checkout: {
    icon: Clock,
    color: 'bg-red-100 text-red-800 border-red-200',
    approvedColor: 'bg-green-100 text-green-800 border-green-200'
  }
};

export function HotelDivergenceBadge({ divergenceType, isApproved, reason }: HotelDivergenceBadgeProps) {
  const config = divergenceConfig[divergenceType];
  const Icon = isApproved ? CheckCircle : config.icon;
  const colorClass = isApproved ? config.approvedColor : config.color;

  const badge = (
    <Badge variant="outline" className={`${colorClass} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      <span>{formatDivergenceLabel(divergenceType)}</span>
      {isApproved && <span className="text-xs">(Approved)</span>}
    </Badge>
  );

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent><p className="max-w-xs">{reason}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
```

### File: `src/components/hotels/hotel-approval-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Hotel } from '@/types/hotel';
import { formatDivergenceLabel, calculateNights } from '@/lib/utils/hotel-calculations';
import { approveDivergence, rejectDivergence } from '@/lib/services/hotel-service';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface HotelApprovalDialogProps {
  hotel: Hotel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprovalChange: () => void;
}

export function HotelApprovalDialog({ hotel, open, onOpenChange, onApprovalChange }: HotelApprovalDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const calculatedNights = calculateNights(hotel.calculated_checkin, hotel.calculated_checkout);
  const actualNights = calculateNights(hotel.actual_checkin, hotel.actual_checkout);
  const extraNights = actualNights - calculatedNights;

  const handleApprove = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await approveDivergence(hotel.id, user.id);
      toast.success('Divergence approved');
      onApprovalChange();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to approve divergence');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await rejectDivergence(hotel.id);
      toast.success('Approval revoked');
      onApprovalChange();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to revoke approval');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Hotel Divergence Review</DialogTitle>
          <DialogDescription>Review and approve or reject the hotel date divergence</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Guest</span>
            <span className="font-medium">{hotel.enrolled?.person?.full_name}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Hotel</span>
            <span>{hotel.hotel_name}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Divergence</span>
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              {hotel.divergence_type && formatDivergenceLabel(hotel.divergence_type)}
            </Badge>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Date Comparison</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Calculated Check-in</p>
                <p>{format(new Date(hotel.calculated_checkin), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Actual Check-in</p>
                <p className="font-medium">{format(new Date(hotel.actual_checkin), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Calculated Check-out</p>
                <p>{format(new Date(hotel.calculated_checkout), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Actual Check-out</p>
                <p className="font-medium">{format(new Date(hotel.actual_checkout), 'MMM dd, yyyy')}</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Nights</span>
                <span>{calculatedNights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Nights</span>
                <span className="font-medium">{actualNights}</span>
              </div>
              {extraNights > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Extra Nights</span>
                  <span className="font-medium">+{extraNights}</span>
                </div>
              )}
            </div>
          </div>

          {hotel.divergence_reason && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Reason Provided</h4>
              <p className="text-sm text-muted-foreground">{hotel.divergence_reason}</p>
            </div>
          )}

          {hotel.divergence_approved && hotel.approved_at && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Approved on {format(new Date(hotel.approved_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {hotel.divergence_approved ? (
            <Button variant="outline" onClick={handleReject} disabled={isLoading}>
              Revoke Approval
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isLoading}>
                Approve Divergence
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/hotels/hotel-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Hotel, HotelFormData, HotelStatus } from '@/types/hotel';
import { createHotel, updateHotel, getEnrolledWithoutHotel } from '@/lib/services/hotel-service';
import { toast } from 'sonner';

const hotelSchema = z.object({
  enrolled_id: z.string().min(1, 'Please select a person'),
  hotel_name: z.string().min(1, 'Hotel name is required'),
  room_type: z.string().optional(),
  actual_checkin: z.string().min(1, 'Check-in date is required'),
  actual_checkout: z.string().min(1, 'Check-out date is required'),
  confirmation_number: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  notes: z.string().optional(),
  divergence_reason: z.string().optional(),
});

interface HotelFormProps {
  eventId: string;
  eventDates: { start_date: string; end_date: string };
  hotel?: Hotel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function HotelForm({ eventId, eventDates, hotel, open, onOpenChange, onSuccess }: HotelFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableEnrolled, setAvailableEnrolled] = useState<Array<{
    id: string;
    person: { id: string; full_name: string; role: string };
  }>>([]);

  const isEditing = !!hotel;

  const form = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      enrolled_id: '',
      hotel_name: '',
      room_type: '',
      actual_checkin: '',
      actual_checkout: '',
      confirmation_number: '',
      status: 'pending',
      notes: '',
      divergence_reason: '',
    },
  });

  useEffect(() => {
    if (open && !isEditing) {
      getEnrolledWithoutHotel(eventId).then(setAvailableEnrolled).catch(console.error);
    }
  }, [open, eventId, isEditing]);

  useEffect(() => {
    if (hotel) {
      form.reset({
        enrolled_id: hotel.enrolled_id,
        hotel_name: hotel.hotel_name,
        room_type: hotel.room_type || '',
        actual_checkin: hotel.actual_checkin.split('T')[0],
        actual_checkout: hotel.actual_checkout.split('T')[0],
        confirmation_number: hotel.confirmation_number || '',
        status: hotel.status,
        notes: hotel.notes || '',
        divergence_reason: hotel.divergence_reason || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        hotel_name: '',
        room_type: '',
        actual_checkin: '',
        actual_checkout: '',
        confirmation_number: '',
        status: 'pending',
        notes: '',
        divergence_reason: '',
      });
    }
  }, [hotel, form]);

  const onSubmit = async (data: HotelFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateHotel(hotel.id, data, eventDates);
        toast.success('Hotel reservation updated');
      } else {
        await createHotel(eventId, data, eventDates);
        toast.success('Hotel reservation created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update reservation' : 'Failed to create reservation');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: HotelStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Hotel Reservation' : 'New Hotel Reservation'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="enrolled_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableEnrolled.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.person.full_name} ({e.person.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="hotel_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., Hilton Garden Inn" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="room_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <FormControl><Input placeholder="e.g., Double, Suite" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="actual_checkin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actual_checkout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="confirmation_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation Number</FormLabel>
                  <FormControl><Input placeholder="Booking confirmation" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="divergence_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Different Dates (if applicable)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explain why dates differ from calculated..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/hotels/hotel-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Hotel, HotelStatus } from '@/types/hotel';
import { HotelDivergenceBadge } from './hotel-divergence-badge';
import { HotelApprovalDialog } from './hotel-approval-dialog';
import { calculateNights } from '@/lib/utils/hotel-calculations';
import { deleteHotel, updateHotelStatus } from '@/lib/services/hotel-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface HotelTableProps {
  hotels: Hotel[];
  onEdit: (hotel: Hotel) => void;
  onRefresh: () => void;
}

const statusConfig: Record<HotelStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
};

export function HotelTable({ hotels, onEdit, onRefresh }: HotelTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvalHotel, setApprovalHotel] = useState<Hotel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteHotel(deleteId);
      toast.success('Hotel reservation deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete reservation');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (hotelId: string, status: HotelStatus) => {
    try {
      await updateHotelStatus(hotelId, status);
      toast.success('Status updated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Nights</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Divergence</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hotel reservations found
                </TableCell>
              </TableRow>
            ) : (
              hotels.map((hotel) => {
                const nights = calculateNights(hotel.actual_checkin, hotel.actual_checkout);
                const statusInfo = statusConfig[hotel.status];

                return (
                  <TableRow key={hotel.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{hotel.enrolled?.person?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{hotel.enrolled?.person?.role}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{hotel.hotel_name}</p>
                        {hotel.room_type && <p className="text-sm text-muted-foreground">{hotel.room_type}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(hotel.actual_checkin), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(new Date(hotel.actual_checkout), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{nights}</TableCell>
                    <TableCell>
                      <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {hotel.has_divergence && hotel.divergence_type ? (
                        <button onClick={() => setApprovalHotel(hotel)}>
                          <HotelDivergenceBadge
                            divergenceType={hotel.divergence_type}
                            isApproved={hotel.divergence_approved}
                            reason={hotel.divergence_reason}
                          />
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(hotel)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          {hotel.has_divergence && (
                            <DropdownMenuItem onClick={() => setApprovalHotel(hotel)}>
                              <Eye className="mr-2 h-4 w-4" />Review Divergence
                            </DropdownMenuItem>
                          )}
                          {hotel.status !== 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(hotel.id, 'confirmed')}>
                              <CheckCircle className="mr-2 h-4 w-4" />Mark Confirmed
                            </DropdownMenuItem>
                          )}
                          {hotel.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(hotel.id, 'cancelled')}>
                              <XCircle className="mr-2 h-4 w-4" />Mark Cancelled
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(hotel.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The hotel reservation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {approvalHotel && (
        <HotelApprovalDialog
          hotel={approvalHotel}
          open={!!approvalHotel}
          onOpenChange={() => setApprovalHotel(null)}
          onApprovalChange={onRefresh}
        />
      )}
    </>
  );
}
```

### File: `src/components/hotels/hotel-filters.tsx`

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { HotelFilters as HotelFiltersType, HotelStatus } from '@/types/hotel';

interface HotelFiltersProps {
  filters: HotelFiltersType;
  onChange: (filters: HotelFiltersType) => void;
}

export function HotelFilters({ filters, onChange }: HotelFiltersProps) {
  const handleSearchChange = (search: string) => {
    onChange({ ...filters, search });
  };

  const handleStatusChange = (status: string) => {
    onChange({ ...filters, status: status === 'all' ? undefined : status as HotelStatus });
  };

  const handleDivergenceChange = (value: string) => {
    let has_divergence: boolean | undefined;
    let divergence_approved: boolean | undefined;

    if (value === 'with_divergence') {
      has_divergence = true;
    } else if (value === 'pending_approval') {
      has_divergence = true;
      divergence_approved = false;
    } else if (value === 'approved') {
      has_divergence = true;
      divergence_approved = true;
    }

    onChange({ ...filters, has_divergence, divergence_approved });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasActiveFilters = filters.search || filters.status || filters.has_divergence !== undefined;

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guest, hotel, confirmation..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={
          filters.has_divergence === undefined ? 'all'
            : filters.divergence_approved === false ? 'pending_approval'
            : filters.divergence_approved === true ? 'approved'
            : 'with_divergence'
        }
        onValueChange={handleDivergenceChange}
      >
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Divergence" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Reservations</SelectItem>
          <SelectItem value="with_divergence">With Divergence</SelectItem>
          <SelectItem value="pending_approval">Pending Approval</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />Clear
        </Button>
      )}
    </div>
  );
}
```

---

## 🎨 Transport Components

### File: `src/components/transport/driver-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Driver, DriverFormData } from '@/types/transport';
import { createDriver, updateDriver } from '@/lib/services/transport-service';
import { toast } from 'sonner';

const driverSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  license_number: z.string().optional(),
  vehicle_info: z.string().optional(),
  is_active: z.boolean(),
  notes: z.string().optional(),
});

interface DriverFormProps {
  driver?: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DriverForm({ driver, open, onOpenChange, onSuccess }: DriverFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!driver;

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      license_number: '',
      vehicle_info: '',
      is_active: true,
      notes: '',
    },
  });

  useEffect(() => {
    if (driver) {
      form.reset({
        full_name: driver.full_name,
        phone: driver.phone || '',
        email: driver.email || '',
        license_number: driver.license_number || '',
        vehicle_info: driver.vehicle_info || '',
        is_active: driver.is_active,
        notes: driver.notes || '',
      });
    } else {
      form.reset({
        full_name: '',
        phone: '',
        email: '',
        license_number: '',
        vehicle_info: '',
        is_active: true,
        notes: '',
      });
    }
  }, [driver, form]);

  const onSubmit = async (data: DriverFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateDriver(driver.id, data);
        toast.success('Driver updated');
      } else {
        await createDriver(data);
        toast.success('Driver created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update driver' : 'Failed to create driver');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Driver' : 'New Driver'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input placeholder="Driver's full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+1 234 567 8900" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="driver@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl><Input placeholder="Driver's license" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicle_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Info</FormLabel>
                  <FormControl><Input placeholder="e.g., Black Toyota Camry" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-muted-foreground">Driver is available for assignments</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/transport/driver-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, UserX } from 'lucide-react';
import { Driver } from '@/types/transport';
import { deactivateDriver } from '@/lib/services/transport-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DriverTableProps {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
  onRefresh: () => void;
}

export function DriverTable({ drivers, onEdit, onRefresh }: DriverTableProps) {
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    
    setIsDeactivating(true);
    try {
      await deactivateDriver(deactivateId);
      toast.success('Driver deactivated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to deactivate driver');
    } finally {
      setIsDeactivating(false);
      setDeactivateId(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No drivers found
                </TableCell>
              </TableRow>
            ) : (
              drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.full_name}</TableCell>
                  <TableCell>{driver.phone || '-'}</TableCell>
                  <TableCell>{driver.email || '-'}</TableCell>
                  <TableCell>{driver.license_number || '-'}</TableCell>
                  <TableCell>{driver.vehicle_info || '-'}</TableCell>
                  <TableCell>
                    <Badge className={driver.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(driver)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        {driver.is_active && (
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeactivateId(driver.id)}>
                            <UserX className="mr-2 h-4 w-4" />Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Driver?</AlertDialogTitle>
            <AlertDialogDescription>
              This driver will be marked as inactive and won't appear in new assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={isDeactivating}>
              {isDeactivating ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### File: `src/components/transport/car-form.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EventCar, EventCarFormData, Driver } from '@/types/transport';
import { createEventCar, updateEventCar, getDrivers } from '@/lib/services/transport-service';
import { toast } from 'sonner';

const carSchema = z.object({
  driver_id: z.string().optional(),
  car_label: z.string().optional(),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  vehicle_type: z.string().optional(),
  license_plate: z.string().optional(),
  notes: z.string().optional(),
});

interface CarFormProps {
  eventId: string;
  car?: EventCar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const vehicleTypes = [
  { value: 'sedan', label: 'Sedan (4 passengers)' },
  { value: 'suv', label: 'SUV (6 passengers)' },
  { value: 'van', label: 'Van (12 passengers)' },
  { value: 'bus', label: 'Bus (20+ passengers)' },
];

export function CarForm({ eventId, car, open, onOpenChange, onSuccess }: CarFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const isEditing = !!car;

  const form = useForm<EventCarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      driver_id: '',
      car_label: '',
      capacity: 4,
      vehicle_type: 'sedan',
      license_plate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      getDrivers(true).then(setDrivers).catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (car) {
      form.reset({
        driver_id: car.driver_id || '',
        car_label: car.car_label || '',
        capacity: car.capacity,
        vehicle_type: car.vehicle_type || 'sedan',
        license_plate: car.license_plate || '',
        notes: car.notes || '',
      });
    } else {
      form.reset({
        driver_id: '',
        car_label: '',
        capacity: 4,
        vehicle_type: 'sedan',
        license_plate: '',
        notes: '',
      });
    }
  }, [car, form]);

  const vehicleType = form.watch('vehicle_type');
  useEffect(() => {
    const capacities: Record<string, number> = { sedan: 4, suv: 6, van: 12, bus: 24 };
    if (vehicleType && capacities[vehicleType] && !isEditing) {
      form.setValue('capacity', capacities[vehicleType]);
    }
  }, [vehicleType, form, isEditing]);

  const onSubmit = async (data: EventCarFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateEventCar(car.id, data);
        toast.success('Car updated');
      } else {
        await createEventCar(eventId, data);
        toast.success('Car added to event');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update car' : 'Failed to add car');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Car' : 'Add Car to Event'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="car_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Label</FormLabel>
                  <FormControl><Input placeholder="e.g., VAN 1, SUV 2" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Driver</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Driver Assigned</SelectItem>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.full_name}{driver.vehicle_info && ` - ${driver.vehicle_info}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity *</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="license_plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl><Input placeholder="ABC-1234" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Car'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/transport/car-table.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { EventCar } from '@/types/transport';
import { deleteEventCar } from '@/lib/services/transport-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface CarTableProps {
  cars: EventCar[];
  onEdit: (car: EventCar) => void;
  onManagePassengers: (car: EventCar) => void;
  onRefresh: () => void;
}

export function CarTable({ cars, onEdit, onManagePassengers, onRefresh }: CarTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteEventCar(deleteId);
      toast.success('Car removed from event');
      onRefresh();
    } catch (error) {
      toast.error('Failed to remove car');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Car #</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Passengers</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No cars assigned to this event
                </TableCell>
              </TableRow>
            ) : (
              cars.map((car) => {
                const passengerCount = car.passengers?.length || 0;
                const fillPercentage = (passengerCount / car.capacity) * 100;

                return (
                  <TableRow key={car.id}>
                    <TableCell className="font-mono font-bold">#{car.car_number}</TableCell>
                    <TableCell>{car.car_label || `CAR ${car.car_number}`}</TableCell>
                    <TableCell>
                      {car.driver ? (
                        <div>
                          <p>{car.driver.full_name}</p>
                          {car.driver.phone && <p className="text-sm text-muted-foreground">{car.driver.phone}</p>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{car.vehicle_type || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell>{car.capacity}</TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{passengerCount} / {car.capacity}</span>
                          {passengerCount > car.capacity && (
                            <Badge variant="destructive" className="text-xs">Overcapacity</Badge>
                          )}
                        </div>
                        <Progress value={Math.min(fillPercentage, 100)} className={fillPercentage > 100 ? 'bg-red-200' : ''} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onManagePassengers(car)}>
                            <Users className="mr-2 h-4 w-4" />Manage Passengers
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(car)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(car.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Car?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the car and all passenger assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### File: `src/components/transport/passenger-assignment.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, UserMinus, Plane, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { format } from 'date-fns';
import { EventCar, CarPassenger } from '@/types/transport';
import { addPassengerToCar, removePassengerFromCar, getUnassignedPassengers } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface PassengerAssignmentProps {
  eventId: string;
  car: EventCar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PassengerAssignment({ eventId, car, open, onOpenChange, onSuccess }: PassengerAssignmentProps) {
  const [activeTab, setActiveTab] = useState<'arrival' | 'departure'>('arrival');
  const [isLoading, setIsLoading] = useState(false);
  const [unassigned, setUnassigned] = useState<Array<{ enrolled_id: string; person_name: string; role: string }>>([]);

  const arrivalPassengers = car.passengers?.filter(p => p.transport_type === 'arrival') || [];
  const departurePassengers = car.passengers?.filter(p => p.transport_type === 'departure') || [];

  const loadUnassigned = async () => {
    setUnassigned([]);
  };

  useEffect(() => {
    if (open) {
      loadUnassigned();
    }
  }, [open, activeTab]);

  const handleAddPassenger = async (enrolledId: string) => {
    setIsLoading(true);
    try {
      await addPassengerToCar(car.id, { enrolled_id: enrolledId, transport_type: activeTab });
      toast.success('Passenger added');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add passenger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassenger = async (passengerId: string) => {
    setIsLoading(true);
    try {
      await removePassengerFromCar(passengerId);
      toast.success('Passenger removed');
      onSuccess();
    } catch (error) {
      toast.error('Failed to remove passenger');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPassengerList = (passengers: CarPassenger[]) => (
    <div className="space-y-2">
      {passengers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No passengers assigned</p>
      ) : (
        passengers.map((passenger) => (
          <div key={passenger.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{passenger.enrolled?.person?.full_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">{passenger.enrolled?.person?.role}</Badge>
                {passenger.flight && (
                  <span className="flex items-center gap-1">
                    <Plane className="h-3 w-3" />{passenger.flight.flight_number}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleRemovePassenger(passenger.id)} disabled={isLoading}>
              <UserMinus className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Passengers - {car.car_label || `CAR #${car.car_number}`}</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm">
            <span>Capacity: {car.capacity}</span>
            <span>Arrivals: {arrivalPassengers.length} | Departures: {departurePassengers.length}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'arrival' | 'departure')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="arrival" className="flex items-center gap-2">
              <PlaneLanding className="h-4 w-4" />Arrivals ({arrivalPassengers.length})
            </TabsTrigger>
            <TabsTrigger value="departure" className="flex items-center gap-2">
              <PlaneTakeoff className="h-4 w-4" />Departures ({departurePassengers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="arrival">
            <ScrollArea className="h-[300px] pr-4">{renderPassengerList(arrivalPassengers)}</ScrollArea>
          </TabsContent>

          <TabsContent value="departure">
            <ScrollArea className="h-[300px] pr-4">{renderPassengerList(departurePassengers)}</ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### File: `src/components/transport/flight-grouping-view.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlaneLanding, PlaneTakeoff, Car, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { FlightGroup } from '@/types/transport';
import { getFlightGroups } from '@/lib/services/transport-service';

interface FlightGroupingViewProps {
  eventId: string;
  onAssignCar: (flightId: string, transportType: 'arrival' | 'departure') => void;
}

export function FlightGroupingView({ eventId, onAssignCar }: FlightGroupingViewProps) {
  const [groups, setGroups] = useState<{ arrivals: FlightGroup[]; departures: FlightGroup[] }>({ arrivals: [], departures: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, [eventId]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await getFlightGroups(eventId);
      setGroups(data);
    } catch (error) {
      console.error('Failed to load flight groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFlightGroup = (group: FlightGroup, type: 'arrival' | 'departure') => (
    <Card key={group.flight.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {type === 'arrival' ? (
              <PlaneLanding className="h-5 w-5 text-blue-600" />
            ) : (
              <PlaneTakeoff className="h-5 w-5 text-orange-600" />
            )}
            {group.flight.flight_number}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {format(new Date(group.flight.datetime), 'MMM dd, yyyy HH:mm')}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{group.passengers.length} passengers</span>
          </div>
          {group.unassigned_count > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <AlertCircle className="h-3 w-3 mr-1" />{group.unassigned_count} unassigned
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {group.passengers.map((passenger) => (
            <div key={passenger.enrolled_id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div>
                <span className="font-medium">{passenger.person_name}</span>
                <Badge variant="outline" className="ml-2 text-xs">{passenger.role}</Badge>
              </div>
              {passenger.assigned_car ? (
                <Badge className="bg-green-100 text-green-800">
                  <Car className="h-3 w-3 mr-1" />
                  {passenger.assigned_car.car_label || `#${passenger.assigned_car.car_number}`}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Not assigned</Badge>
              )}
            </div>
          ))}
        </div>

        {group.unassigned_count > 0 && (
          <Button variant="outline" className="w-full mt-3" onClick={() => onAssignCar(group.flight.id, type)}>
            <Car className="h-4 w-4 mr-2" />Assign to Car
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="text-center py-8">Loading flight groups...</div>;
  }

  return (
    <Tabs defaultValue="arrivals">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="arrivals" className="flex items-center gap-2">
          <PlaneLanding className="h-4 w-4" />Arrivals ({groups.arrivals.length})
        </TabsTrigger>
        <TabsTrigger value="departures" className="flex items-center gap-2">
          <PlaneTakeoff className="h-4 w-4" />Departures ({groups.departures.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="arrivals">
        {groups.arrivals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No arrival flights with passengers</p>
        ) : (
          groups.arrivals.map((group) => renderFlightGroup(group, 'arrival'))
        )}
      </TabsContent>

      <TabsContent value="departures">
        {groups.departures.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No departure flights with passengers</p>
        ) : (
          groups.departures.map((group) => renderFlightGroup(group, 'departure'))
        )}
      </TabsContent>
    </Tabs>
  );
}
```

---

## 📄 Pages

### File: `src/app/(dashboard)/events/[eventId]/hotels/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Hotel, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { HotelTable } from '@/components/hotels/hotel-table';
import { HotelForm } from '@/components/hotels/hotel-form';
import { HotelFilters } from '@/components/hotels/hotel-filters';
import { Hotel as HotelType, HotelFilters as HotelFiltersType } from '@/types/hotel';
import { getEventHotels, getHotelStats } from '@/lib/services/hotel-service';
import { getEventById } from '@/lib/services/event-service';

export default function HotelsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [hotels, setHotels] = useState<HotelType[]>([]);
  const [editingHotel, setEditingHotel] = useState<HotelType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState<HotelFiltersType>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, with_divergence: 0, pending_approval: 0 });
  const [eventDates, setEventDates] = useState({ start_date: '', end_date: '' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hotelsData, statsData, event] = await Promise.all([
        getEventHotels(eventId, filters),
        getHotelStats(eventId),
        getEventById(eventId),
      ]);
      setHotels(hotelsData);
      setStats(statsData);
      if (event) {
        setEventDates({ start_date: event.start_date, end_date: event.end_date });
      }
    } catch (error) {
      console.error('Failed to load hotels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (hotel: HotelType) => {
    setEditingHotel(hotel);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingHotel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotel Reservations</h1>
          <p className="text-muted-foreground">Manage hotel accommodations for event participants</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Reservation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.confirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Divergence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">{stats.with_divergence}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{stats.pending_approval}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <HotelFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <HotelTable hotels={hotels} onEdit={handleEdit} onRefresh={loadData} />
      )}

      {/* Form Dialog */}
      <HotelForm
        eventId={eventId}
        eventDates={eventDates}
        hotel={editingHotel}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={loadData}
      />
    </div>
  );
}
```

### File: `src/app/(dashboard)/events/[eventId]/transport/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Car, Users, PlaneLanding, PlaneTakeoff, UserCheck } from 'lucide-react';
import { CarTable } from '@/components/transport/car-table';
import { CarForm } from '@/components/transport/car-form';
import { DriverTable } from '@/components/transport/driver-table';
import { DriverForm } from '@/components/transport/driver-form';
import { PassengerAssignment } from '@/components/transport/passenger-assignment';
import { FlightGroupingView } from '@/components/transport/flight-grouping-view';
import { EventCar, Driver } from '@/types/transport';
import { getEventCars, getDrivers, getTransportStats } from '@/lib/services/transport-service';

export default function TransportPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [activeTab, setActiveTab] = useState('cars');
  const [cars, setCars] = useState<EventCar[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editingCar, setEditingCar] = useState<EventCar | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isCarFormOpen, setIsCarFormOpen] = useState(false);
  const [isDriverFormOpen, setIsDriverFormOpen] = useState(false);
  const [passengerCar, setPassengerCar] = useState<EventCar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total_cars: 0,
    total_capacity: 0,
    assigned_arrivals: 0,
    assigned_departures: 0,
    unassigned_arrivals: 0,
    unassigned_departures: 0,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [carsData, driversData, statsData] = await Promise.all([
        getEventCars(eventId),
        getDrivers(),
        getTransportStats(eventId),
      ]);
      setCars(carsData);
      setDrivers(driversData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load transport data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditCar = (car: EventCar) => {
    setEditingCar(car);
    setIsCarFormOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setIsDriverFormOpen(true);
  };

  const handleCarFormClose = () => {
    setIsCarFormOpen(false);
    setEditingCar(null);
  };

  const handleDriverFormClose = () => {
    setIsDriverFormOpen(false);
    setEditingDriver(null);
  };

  const handleAssignCar = (flightId: string, transportType: 'arrival' | 'departure') => {
    console.log('Assign car for flight:', flightId, transportType);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transport Management</h1>
          <p className="text-muted-foreground">Manage cars, drivers, and passenger assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDriverFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Driver
          </Button>
          <Button onClick={() => setIsCarFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Car
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total_cars}</span>
              <span className="text-sm text-muted-foreground">({stats.total_capacity} seats)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Arrivals Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PlaneLanding className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.assigned_arrivals}</span>
              {stats.unassigned_arrivals > 0 && (
                <span className="text-sm text-orange-600">({stats.unassigned_arrivals} pending)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Departures Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PlaneTakeoff className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.assigned_departures}</span>
              {stats.unassigned_departures > 0 && (
                <span className="text-sm text-orange-600">({stats.unassigned_departures} pending)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{drivers.filter(d => d.is_active).length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cars">Event Cars</TabsTrigger>
          <TabsTrigger value="flights">By Flight</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
        </TabsList>

        <TabsContent value="cars" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <CarTable
              cars={cars}
              onEdit={handleEditCar}
              onManagePassengers={setPassengerCar}
              onRefresh={loadData}
            />
          )}
        </TabsContent>

        <TabsContent value="flights" className="mt-4">
          <FlightGroupingView eventId={eventId} onAssignCar={handleAssignCar} />
        </TabsContent>