export type StagingStatus = 'checked' | 'missed' | 'verify_at_venue' | 'pending';

export interface StagingCheckin {
  id: string;
  event_id: string;
  enrolled_id: string;
  bus_number: string | null;
  bus_time: string | null;
  passport_status: StagingStatus;
  nails_status: StagingStatus;
  cup_status: StagingStatus;
  mouthguard_status: StagingStatus;
  uniform_status: StagingStatus;
  coaches_with_bus_count: number;
  coaches_credentials_given: number;
  notes: string | null;
  call_order: number | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StagingRow extends StagingCheckin {
  // Fight Info
  corner?: 'RED' | 'BLUE' | null;
  fight_order?: number | null;
  
  person: {
    id: string;
    compiled_name: string;
    nationality?: string;
    fighter_id?: string;
    photo_url?: string; // We'll need to construct this from passport_photo or similar
  };
  event_name?: string;
}

// For live updates
export interface StagingUpdate {
  id: string;
  field: keyof StagingCheckin;
  value: any;
}
