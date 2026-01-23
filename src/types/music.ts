export type MusicStatus = 'pending' | 'confirmed' | 'not_provided' | 'uploaded';

export type MusicSource = 'url' | 'upload' | 'spotify' | 'youtube';

export interface EntranceMusic {
  id: string;
  event_id: string;
  enrolled_id: string;
  
  // Music info
  song_title: string;
  artist: string;
  
  // Source
  source_type: MusicSource;
  source_url: string | null;       // URL for streaming services
  file_path: string | null;        // Path for uploaded files
  
  // Playback
  start_time_seconds: number;      // Where to start playing (default 0)
  duration_seconds: number | null; // How long to play
  
  // Status
  status: MusicStatus;
  
  // Order
  walkout_order: number | null;    // Order in the event
  
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
  };
}

export interface EntranceMusicFormData {
  enrolled_id: string;
  song_title: string;
  artist: string;
  source_type: MusicSource;
  source_url?: string;
  start_time_seconds: number;
  duration_seconds?: number;
  status: MusicStatus;
  walkout_order?: number;
  notes?: string;
}

export interface MusicFilters {
  status?: MusicStatus;
  search?: string;
}
