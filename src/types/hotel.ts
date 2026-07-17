// Hotel reservation status
export type HotelStatus = 'pending' | 'confirmed' | 'cancelled';

// Divergence types
export type DivergenceType = 'pre_booking' | 'early_checkin' | 'late_checkout';

// Room types (UAE-20 Mod 6). Twin = 2 beds, Double = 1 bed for 2 people,
// Single = 1 bed for 1 person; extra beds can be requested on top.
export type RoomType = 'single' | 'twin' | 'double' | 'suite';

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'single', label: 'Single (1 bed / 1 person)' },
  { value: 'twin', label: 'Twin (2 beds)' },
  { value: 'double', label: 'Double (1 bed / 2 people)' },
  { value: 'suite', label: 'Suite' },
];

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

  // Room assignment (UAE-20 Mod 6). Roommates share the same room_number —
  // that is the who-is-with-whom link.
  room_type: RoomType | string | null;
  room_number: string | null;
  extra_bed: boolean;
  
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
  room_type?: RoomType | '';
  room_number?: string;
  extra_bed?: boolean;
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
