export interface EventMetrics {
  // People
  total_enrolled: number;
  fighters: number;
  staff: number;
  vips: number;
  
  // Flights
  total_flights: number;
  arrivals_today: number;
  departures_today: number;
  pending_tickets: number;
  
  // Visas
  total_visas: number;
  visas_approved: number;
  visas_pending: number;
  visas_denied: number;
  
  // Hotels
  total_reservations: number;
  hotels_confirmed: number;
  hotels_pending: number;
  divergences_pending: number;
  
  // Transport
  total_cars: number;
  arrivals_assigned: number;
  departures_assigned: number;
  unassigned_arrivals: number;
  unassigned_departures: number;
  unassigned_transport: number;
  
  // Pre-event
  clearance_complete: number;
  clearance_partial: number;
  clearance_pending: number;
  clearance_denied: number;
  
  // Tasks
  total_tasks: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_overdue: number;
  
  // Batches
  total_batches: number;
  batches_today: number;
  batches_completed: number;
}

export interface ModuleStatus {
  module: string;
  label: string;
  icon: string;
  total: number;
  completed: number;
  pending: number;
  alerts: number;
  progress: number;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

export interface UpcomingDeadline {
  id: string;
  type: 'flight' | 'batch' | 'task' | 'visa' | 'hotel' | 'medical';
  title: string;
  description: string;
  datetime: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  link?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  color?: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  action: string;
  subject: string;
  actor?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardData {
  event: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
    status: string;
  };
  metrics: EventMetrics;
  modules: ModuleStatus[];
  deadlines: UpcomingDeadline[];
  recentActivity: ActivityItem[];
}
