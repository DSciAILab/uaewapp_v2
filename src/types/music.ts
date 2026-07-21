export type MusicStatus = 'pending' | 'confirmed' | 'not_provided' | 'uploaded';

// Per-song approval (UAE-20): each of the 3 walkout slots has its own status;
// the row counts as Done once any one song is approved.
export type SongStatus = 'pending' | 'approved' | 'rejected';

// UAE-62 (Fernando, 21/07): a fighter who has submitted all 3 song links counts
// as Done — the presence of the three tracks is the completion signal, no separate
// approval step. Kept as a DERIVED property rather than a stored flag on purpose:
// the stored `status` had drifted (records showing confirmed with zero approved
// songs, others pending with identical data), so "done" is computed live from the
// data it depends on. The `|| status === 'confirmed'` arm preserves any record a
// human already confirmed even if it carries fewer than three links.
export function isMusicDone(
  m:
    | {
        source_url: string | null;
        source_url_2: string | null;
        source_url_3: string | null;
        status: string | null;
      }
    | null,
): boolean {
  if (!m) return false;
  const allThree = !!(m.source_url && m.source_url_2 && m.source_url_3);
  return allThree || m.status === 'confirmed';
}

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
  status_1: SongStatus;
  status_2: SongStatus;
  status_3: SongStatus;

  // Resolved YouTube titles, cached at save time (null for non-YouTube links).
  title_1: string | null;
  title_2: string | null;
  title_3: string | null;
  
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
      compiled_name: string;
      appadmin_fighter_id?: string; 
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
  status_1?: SongStatus;
  status_2?: SongStatus;
  status_3?: SongStatus;
  title_1?: string | null;
  title_2?: string | null;
  title_3?: string | null;
  notes?: string | null;
}

export interface MusicFilters {
  status?: MusicStatus;
  search?: string;
}
