// Hotel reservation status
export type HotelStatus = 'pending' | 'confirmed' | 'cancelled';

// Divergence types
export type DivergenceType = 'pre_booking' | 'early_checkin' | 'late_checkout';

export interface Hotel {
  id: string;
  enrollment_id: string;
  
  // Suggested dates (based on flights + event margins)
  suggested_checkin_date: string | null;
  suggested_checkin_time: string | null;
  suggested_checkout_date: string | null;
  suggested_checkout_time: string | null;
  
  // Actual dates (may differ, creating divergences)
  checkin_date: string | null;
  checkin_time: string | null;
  checkout_date: string | null;
  checkout_time: string | null;
  
  // Divergence tracking
  has_divergence: boolean;
  divergence_type: string[] | null;
  divergence_approved: boolean | null;
  divergence_approved_by: string | null;
  divergence_approved_at: string | null;
  
  // Booking info
  reservation_number: string | null;
  status: HotelStatus | 'reserved';
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  
  // Joined data
  enrolled?: {
    id: string;
    event_id: string;
    person: {
      id: string;
      compiled_name: string;
      role?: { name: string };
      appadmin_fighter_id?: string | null;
      event_name?: string;
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
  checkin_date: string;
  checkout_date: string;
  reservation_number?: string;
  status: HotelStatus | 'reserved';
  notes?: string;
  divergence_type?: string[];
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
