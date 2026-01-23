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
    assigned_car?: {
      id: string;
      car_number: number;
      car_label: string | null;
    };
  }>;
  unassigned_count: number;
}
