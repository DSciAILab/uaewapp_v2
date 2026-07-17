// Transport domain types. These mirror the CURRENT schema (mma_drivers /
// mma_event_cars / mma_car_passengers) as declared in src/types/supabase.ts.
//
// Data model note: a car is a VEHICLE, not a trip. The arrival/departure
// concept lives on the PASSENGER (mma_car_passengers.transport_type), so a
// single car may legitimately carry both arrival and departure passengers.

/**
 * Mirrors the DB CHECK constraint on mma_car_passengers.transport_type:
 *   CHECK (transport_type = ANY (ARRAY['arrival', 'departure']))
 * There is deliberately no 'event' member — see EventCar docs.
 */
export type TransportType = 'arrival' | 'departure';

export const TRANSPORT_TYPES: TransportType[] = ['arrival', 'departure'];

/**
 * Trip type of the CAR itself (mma_event_cars.transport_type, added UAE-20).
 * Unlike passenger transport_type, this includes standalone services that are
 * not tied to athletes or flights.
 */
export type CarTransportType = 'arrival' | 'departure' | 'shuttle' | 'custom';

export const CAR_TRANSPORT_TYPES: CarTransportType[] = ['arrival', 'departure', 'shuttle', 'custom'];

export interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  vehicle_info: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DriverFormData {
  full_name: string;
  phone?: string;
  is_active: boolean;
  notes?: string;
}

/**
 * A vehicle assigned to an event.
 *
 * Columns that existed on the old `mma_transport_cars` and have NO equivalent
 * here — do not re-add them without a schema change:
 *   - type ('arrival' | 'departure' | 'event') -> now per-passenger
 *     (CarPassenger.transport_type), and 'event' is not representable at all.
 *   - status ('scheduled' | 'in_progress' | ...) -> no column on any transport
 *     table; the transfer status workflow has no backing store.
 *   - flight_number / flight_date / flight_time / airport -> reachable only
 *     per-passenger via CarPassenger.flight_id -> mma_flights.
 *   - route_from / route_to -> per-passenger pickup_location / dropoff_location.
 *   - scheduled_date / scheduled_time -> per-passenger pickup_time (free text).
 */
export interface EventCar {
  id: string;
  event_id: string;
  driver_id: string | null;
  car_number: number;
  car_label: string | null;
  capacity: number;
  vehicle_type: string | null;
  license_plate: string | null;
  notes: string | null;
  // Trip fields (UAE-20): let a car be a standalone transport (e.g. a shuttle)
  // with its own route/schedule and no passengers.
  transport_type: CarTransportType | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string | null;
  updated_at: string | null;

  // Joined data
  driver?: Driver | null;
  passengers?: CarPassenger[];

  /**
   * DERIVED, not a column: the distinct transport_type values of this car's
   * passengers, computed in getEventCars(). Empty for a car with no passengers
   * yet — a car has no intrinsic direction in this schema.
   */
  transport_types?: TransportType[];
}

export interface EventCarFormData {
  driver_id?: string;
  car_label?: string;
  capacity?: number;
  vehicle_type?: string;
  license_plate?: string;
  notes?: string;
  transport_type?: CarTransportType | '';
  pickup_location?: string;
  dropoff_location?: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

export interface CarPassenger {
  id: string;
  car_id: string;
  enrolled_id: string;
  transport_type: TransportType;
  flight_id: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  /** Free-text in the DB (column type is `text`, not `time`). */
  pickup_time: string | null;
  notes: string | null;
  created_at: string | null;

  // Joined data
  enrolled?: {
    id: string;
    person: {
      id: string;
      compiled_name: string;
      role?: { name: string };
    };
  } | null;
}

export interface CarPassengerFormData {
  enrolled_id: string;
  /** Required: the column is NOT NULL with no default. */
  transport_type: TransportType;
  flight_id?: string;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_time?: string;
  notes?: string;
}

/** One enrollment that still needs a car for a given direction. */
export interface UnassignedPassenger {
  enrolled_id: string;
  person_name: string;
  role?: { name: string } | null;
  transport_type: TransportType;
  flight?: Record<string, unknown> | null;
  /** Raw enrollment row, kept for callers that group by flight. */
  enrollment: Record<string, unknown> & { id: string };
}

export interface FlightGroup {
  flight: {
    id: string;
    flight_number: string;
    datetime: string;
    type: TransportType;
  };
  passengers: Array<{
    enrolled_id: string;
    person_id: string;
    person_name: string;
    role?: { name: string };
    assigned_car?: EventCar;
  }>;
  unassigned_count: number;
}

export interface TransportStatsData {
  total_cars: number;
  total_drivers: number;
  active_drivers: number;
  assigned_cars: number;
  total_capacity: number;
}
