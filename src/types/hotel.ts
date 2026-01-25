// Hotel reservation status
export type HotelStatus = 'pending' | 'confirmed' | 'cancelled';

// Divergence types
export type DivergenceType = 'pre_booking' | 'early_checkin' | 'late_checkout';

export interface Hotel {
  id: string;
  enrollment_id: string; // Renamed from enrolled_id
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
  primary_divergence_type: DivergenceType | null;
  divergence_reason: string | null;
  divergence_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  
  // Booking info
  confirmation_number: string | null;
  room_number: string | null;
  status: HotelStatus;
  notes: string | null;
  checked_in_at: string | null;
  
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
  enrollment_id: string;
  hotel_name?: string;
  room_type?: string;
  room_number?: string;
  actual_checkin: string;
  actual_checkout: string;
  checked_in_at?: string;
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
