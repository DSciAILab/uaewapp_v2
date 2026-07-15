export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TaskCategory = 
  | 'logistics'
  | 'production'
  | 'medical'
  | 'security'
  | 'media'
  | 'hospitality'
  | 'technical'
  | 'administrative'
  | 'other';

// Task templates (reusable across events)
export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  category: TaskCategory;
  default_priority: TaskPriority;
  estimated_duration_minutes: number | null;
  checklist_items: string[]; // JSON array of checklist items
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateFormData {
  name: string;
  description?: string;
  category: TaskCategory;
  default_priority: TaskPriority;
  estimated_duration_minutes?: number;
  checklist_items: string[];
  is_active: boolean;
}

// Event-specific tasks
export interface EventTask {
  id: string;
  event_id: string;
  template_id: string | null;
  
  // Task info
  name: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  
  // Assignment
  assigned_to: string | null; // user_id
  assigned_by: string | null; // user_id
  
  // Timing
  due_date: string | null;
  due_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  
  // Checklist
  checklist_items: TaskChecklistItem[];
  
  // Notes
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  assigned_user?: {
    id: string;
    compiled_name: string;
  };
  template?: TaskTemplate;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export interface EventTaskFormData {
  template_id?: string;
  name: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  due_date?: string;
  due_time?: string;
  checklist_items: string[];
  notes?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assigned_to?: string;
  search?: string;
}

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  logistics: 'Logistics',
  production: 'Production',
  medical: 'Medical',
  security: 'Security',
  media: 'Media',
  hospitality: 'Hospitality',
  technical: 'Technical',
  administrative: 'Administrative',
  other: 'Other',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
