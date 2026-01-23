// Batch types for different processes
export type BatchType = 
  | 'weigh_in'
  | 'medical'
  | 'credentials'
  | 'media'
  | 'rules_meeting'
  | 'custom';

// Batch status
export type BatchStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Participant status in batch
export type BatchParticipantStatus = 'assigned' | 'checked_in' | 'completed' | 'no_show' | 'removed';

export interface Batch {
  id: string;
  event_id: string;
  
  // Batch info
  batch_type: BatchType;
  batch_number: number; // Auto-incremented per event+type
  name: string;
  description: string | null;
  
  // Scheduling
  scheduled_date: string;
  start_time: string;
  end_time: string | null;
  
  // Location
  location: string | null;
  room: string | null;
  
  // Capacity
  max_capacity: number | null;
  
  // Status
  status: BatchStatus;
  started_at: string | null;
  completed_at: string | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  participants?: BatchParticipant[];
  participant_count?: number;
}

export interface BatchFormData {
  batch_type: BatchType;
  name: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  location?: string;
  room?: string;
  max_capacity?: number | null;
  status: BatchStatus;
  notes?: string;
}

export interface BatchParticipant {
  id: string;
  batch_id: string;
  enrolled_id: string;
  
  // Order
  order_number: number; // Position in batch
  
  // Status
  status: BatchParticipantStatus;
  checked_in_at: string | null;
  completed_at: string | null;
  
  // Results (for weigh-in, medical, etc.)
  result_data: Record<string, unknown> | null; // Flexible JSON for different batch types
  
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  enrolled?: {
    id: string;
    person: {
      id: string;
      full_name: string;
      role: string;
    };
  };
}

export interface BatchParticipantFormData {
  enrolled_id: string;
  order_number?: number;
  status?: BatchParticipantStatus;
  notes?: string;
}

export interface BatchFilters {
  batch_type?: BatchType;
  status?: BatchStatus;
  scheduled_date?: string;
  search?: string;
}

export interface BatchTimeline {
  date: string;
  batches: Batch[];
}

export const BATCH_TYPE_LABELS: Record<BatchType, string> = {
  weigh_in: 'Weigh-in',
  medical: 'Medical Check',
  credentials: 'Credentials',
  media: 'Media/Press',
  rules_meeting: 'Rules Meeting',
  custom: 'Custom',
};

export const BATCH_TYPE_COLORS: Record<BatchType, string> = {
  weigh_in: 'bg-orange-100 text-orange-800 border-orange-200',
  medical: 'bg-red-100 text-red-800 border-red-200',
  credentials: 'bg-blue-100 text-blue-800 border-blue-200',
  media: 'bg-purple-100 text-purple-800 border-purple-200',
  rules_meeting: 'bg-green-100 text-green-800 border-green-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
