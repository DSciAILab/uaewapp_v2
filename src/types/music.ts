export type MusicStatus = 'pending' | 'confirmed' | 'not_provided' | 'uploaded';

export type MusicSource = 'url' | 'upload' | 'spotify' | 'youtube';

export interface EntranceMusic {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Primary Source
  source_type: MusicSource;
  source_url: string | null;
  start_time_seconds: number;

  // Additional Sources
  source_url_2: string | null;
  start_time_2: number | null;
  source_url_3: string | null;
  start_time_3: number | null;
  
  // Status
  status: MusicStatus;
  
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    id: string;
    corner?: string; 
    corner_color?: string; // Fallback
    person: {
      id: string;
      full_name: string;
      fighter_id?: string; 
      event_name?: string;
      role?: string;
    };
  };
}

export interface EntranceMusicFormData {
  enrolled_id: string;
  source_type: MusicSource;
  source_url?: string;
  start_time_seconds: number;
  source_url_2?: string;
  start_time_2?: number;
  source_url_3?: string;
  start_time_3?: number;
  status: MusicStatus;
  notes?: string;
}

export interface MusicFilters {
  status?: MusicStatus;
  search?: string;
}
