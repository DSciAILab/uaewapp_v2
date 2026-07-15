export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverFormData {
  name: string;
  phone?: string;
  is_active: boolean;
  notes?: string;
}

export interface EventCar {
  id: string;
  event_id: string;
  driver_id: string | null;
  car_number: number;
  type: 'arrival' | 'departure' | 'event';
  vehicle_type: string | null;
  flight_number: string | null;
  flight_date: string | null;
  flight_time: string | null;
  airport: string | null;
  route_from: string | null;
  route_to: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  driver?: Driver;
  passengers?: CarPassenger[];
}

export interface EventCarFormData {
  driver_id?: string;
  type: 'arrival' | 'departure' | 'event';
  vehicle_type?: string;
  flight_number?: string;
  flight_date?: string;
  flight_time?: string;
  airport?: string;
  route_from?: string;
  route_to?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

export interface CarPassenger {
  id: string;
  car_id: string;
  enrollment_id: string;
  created_at: string;
  
  // Joined data
  enrolled?: {
    id: string;
    person: {
      id: string;
      compiled_name: string;
      role?: { name: string };
    };
  };
}

export interface CarPassengerFormData {
  enrollment_id: string;
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
    person_id: string;
    person_name: string;
    role?: { name: string };
    assigned_car?: EventCar;
  }>;
  unassigned_count: number;
}
