export type WarRoomChannel = 
  | 'flights'
  | 'hotels'
  | 'transport'
  | 'tasks'
  | 'batches'
  | 'pre-event'
  | 'general';

export interface RealtimeUpdate {
  id: string;
  channel: WarRoomChannel;
  type: 'insert' | 'update' | 'delete';
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
  timestamp: string;
}

export interface LiveStatus {
  id: string;
  category: string;
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'critical';
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role?: { name: string };
  status: 'online' | 'away' | 'offline';
  current_section?: string;
  last_seen: string;
}

export interface WarRoomAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by?: string;
}

export interface QuickToggle {
  id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  current_status: string;
  available_statuses: string[];
  last_updated: string;
}

export interface WarRoomState {
  connected: boolean;
  lastSync: string;
  activeUsers: TeamMember[];
  liveStatuses: LiveStatus[];
  alerts: WarRoomAlert[];
  activityFeed: RealtimeUpdate[];
}

export interface CountdownTarget {
  id: string;
  label: string;
  target_datetime: string;
  type: 'event_start' | 'weigh_in' | 'fight_night' | 'custom';
}
