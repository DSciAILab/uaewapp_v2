# SPRINT 08: Dashboard + War Room + Deploy

## 📋 Sprint Overview

**Sprint**: 08 - Dashboard + War Room + Deploy
**Duration**: 3-4 days
**Dependencies**: All previous sprints (00-07)
**Objective**: Implement event dashboard with real-time metrics, War Room for live operations with WebSocket sync, and production deployment configuration

---

## 🎯 Sprint Goals

1. **Dashboard Module**
   - Event overview with key metrics
   - Status summaries for all modules (flights, hotels, transport, pre-event, tasks)
   - Quick action shortcuts
   - Upcoming deadlines and alerts
   - Progress tracking widgets

2. **War Room Module**
   - Real-time operational view using Supabase Realtime
   - Live status updates via WebSocket
   - Activity feed with recent changes
   - Quick status toggles
   - Multi-user sync for team coordination

3. **Deploy Configuration**
   - Vercel deployment setup
   - Environment variables configuration
   - Production security checklist
   - Performance optimization
   - Final testing checklist

---

## 📁 Files to Create

```
src/
├── lib/
│   ├── services/
│   │   ├── dashboard-service.ts
│   │   └── war-room-service.ts
│   ├── realtime/
│   │   ├── realtime-provider.tsx
│   │   ├── use-realtime.ts
│   │   └── channels.ts
│   └── utils/
│       └── metrics.ts
├── components/
│   ├── dashboard/
│   │   ├── dashboard-header.tsx
│   │   ├── metrics-grid.tsx
│   │   ├── status-card.tsx
│   │   ├── progress-widget.tsx
│   │   ├── upcoming-deadlines.tsx
│   │   ├── quick-actions.tsx
│   │   └── activity-summary.tsx
│   └── war-room/
│       ├── war-room-layout.tsx
│       ├── live-status-board.tsx
│       ├── activity-feed.tsx
│       ├── quick-toggle-panel.tsx
│       ├── team-presence.tsx
│       ├── alerts-panel.tsx
│       └── countdown-timer.tsx
├── app/
│   └── (dashboard)/
│       └── events/
│           └── [eventId]/
│               ├── page.tsx (dashboard)
│               └── war-room/
│                   └── page.tsx
├── types/
│   ├── dashboard.ts
│   └── war-room.ts
└── config/
    └── deploy.ts
```

---

## 📝 Type Definitions

### File: `src/types/dashboard.ts`

```typescript
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
```

### File: `src/types/war-room.ts`

```typescript
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
  role: string;
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
```

---

## 🔧 Realtime Infrastructure

### File: `src/lib/realtime/channels.ts`

```typescript
import { RealtimeChannel } from '@supabase/supabase-js';

export const REALTIME_CHANNELS = {
  EVENT_UPDATES: (eventId: string) => `event:${eventId}`,
  WAR_ROOM: (eventId: string) => `war-room:${eventId}`,
  PRESENCE: (eventId: string) => `presence:${eventId}`,
} as const;

export const SUBSCRIBED_TABLES = [
  'mma_enrolled',
  'mma_flights',
  'mma_flight_tickets',
  'mma_visas',
  'mma_hotels',
  'mma_event_cars',
  'mma_car_passengers',
  'mma_blood_tests',
  'mma_medical_exams',
  'mma_event_tasks',
  'mma_batches',
  'mma_batch_participants',
] as const;

export type SubscribedTable = typeof SUBSCRIBED_TABLES[number];

export interface ChannelConfig {
  name: string;
  tables: SubscribedTable[];
  filter?: string;
}

export function getEventChannelConfig(eventId: string): ChannelConfig {
  return {
    name: REALTIME_CHANNELS.EVENT_UPDATES(eventId),
    tables: [...SUBSCRIBED_TABLES],
    filter: `event_id=eq.${eventId}`,
  };
}
```

### File: `src/lib/realtime/use-realtime.ts`

```typescript
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SUBSCRIBED_TABLES, SubscribedTable } from './channels';
import { RealtimeUpdate } from '@/types/war-room';

interface UseRealtimeOptions {
  eventId: string;
  onUpdate?: (update: RealtimeUpdate) => void;
  tables?: SubscribedTable[];
}

interface UseRealtimeReturn {
  isConnected: boolean;
  lastUpdate: RealtimeUpdate | null;
  updates: RealtimeUpdate[];
  error: Error | null;
}

export function useRealtime({
  eventId,
  onUpdate,
  tables = [...SUBSCRIBED_TABLES],
}: UseRealtimeOptions): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const handleChange = useCallback((
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => {
    const update: RealtimeUpdate = {
      id: crypto.randomUUID(),
      channel: mapTableToChannel(payload.table as SubscribedTable),
      type: payload.eventType as 'insert' | 'update' | 'delete',
      table: payload.table,
      record: payload.new as Record<string, unknown>,
      old_record: payload.old as Record<string, unknown> | undefined,
      timestamp: new Date().toISOString(),
    };

    setLastUpdate(update);
    setUpdates(prev => [update, ...prev].slice(0, 100)); // Keep last 100
    onUpdate?.(update);
  }, [onUpdate]);

  useEffect(() => {
    const channel = supabase.channel(`war-room:${eventId}`);

    // Subscribe to each table
    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `event_id=eq.${eventId}`,
        },
        handleChange
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError(new Error('Failed to connect to realtime channel'));
      } else if (status === 'CLOSED') {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [eventId, tables, handleChange, supabase]);

  return { isConnected, lastUpdate, updates, error };
}

function mapTableToChannel(table: SubscribedTable): string {
  const mapping: Record<SubscribedTable, string> = {
    mma_enrolled: 'general',
    mma_flights: 'flights',
    mma_flight_tickets: 'flights',
    mma_visas: 'general',
    mma_hotels: 'hotels',
    mma_event_cars: 'transport',
    mma_car_passengers: 'transport',
    mma_blood_tests: 'pre-event',
    mma_medical_exams: 'pre-event',
    mma_event_tasks: 'tasks',
    mma_batches: 'batches',
    mma_batch_participants: 'batches',
  };
  return mapping[table] || 'general';
}
```

### File: `src/lib/realtime/realtime-provider.tsx`

```typescript
'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { TeamMember } from '@/types/war-room';
import { useAuth } from '@/hooks/use-auth';

interface RealtimeContextType {
  isConnected: boolean;
  activeUsers: TeamMember[];
  broadcastPresence: (section?: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

interface RealtimeProviderProps {
  eventId: string;
  children: ReactNode;
}

export function RealtimeProvider({ eventId, children }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<TeamMember[]>([]);
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`presence:${eventId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TeamMember[] = [];
        
        Object.entries(state).forEach(([userId, presences]) => {
          const presence = presences[0] as any;
          users.push({
            id: userId,
            name: presence.name || 'Unknown',
            role: presence.role || 'User',
            status: 'online',
            current_section: presence.section,
            last_seen: new Date().toISOString(),
          });
        });
        
        setActiveUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            name: user.email || user.id,
            role: 'Admin', // Get from user profile
            section: 'dashboard',
            online_at: new Date().toISOString(),
          });
        }
      });

    setPresenceChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [eventId, user, supabase]);

  const broadcastPresence = async (section?: string) => {
    if (presenceChannel && user) {
      await presenceChannel.track({
        name: user.email || user.id,
        role: 'Admin',
        section: section || 'dashboard',
        online_at: new Date().toISOString(),
      });
    }
  };

  return (
    <RealtimeContext.Provider value={{ isConnected, activeUsers, broadcastPresence }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
}
```

---

## 🔧 Dashboard Service

### File: `src/lib/services/dashboard-service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import { DashboardData, EventMetrics, ModuleStatus, UpcomingDeadline, ActivityItem } from '@/types/dashboard';
import { format, isToday, isTomorrow, addDays, isBefore } from 'date-fns';

const supabase = createClient();

export async function getDashboardData(eventId: string): Promise<DashboardData> {
  const [event, metrics, deadlines, activity] = await Promise.all([
    getEventInfo(eventId),
    getEventMetrics(eventId),
    getUpcomingDeadlines(eventId),
    getRecentActivity(eventId),
  ]);

  const modules = calculateModuleStatuses(metrics);

  return {
    event,
    metrics,
    modules,
    deadlines,
    recentActivity: activity,
  };
}

async function getEventInfo(eventId: string) {
  const { data, error } = await supabase
    .from('mma_events')
    .select('id, name, start_date, end_date, location, status')
    .eq('id', eventId)
    .single();

  if (error) throw new Error('Failed to fetch event info');

  return data;
}

export async function getEventMetrics(eventId: string): Promise<EventMetrics> {
  // Parallel fetch all counts
  const [
    enrolled,
    flights,
    visas,
    hotels,
    transport,
    preEvent,
    tasks,
    batches,
  ] = await Promise.all([
    getEnrolledMetrics(eventId),
    getFlightMetrics(eventId),
    getVisaMetrics(eventId),
    getHotelMetrics(eventId),
    getTransportMetrics(eventId),
    getPreEventMetrics(eventId),
    getTaskMetrics(eventId),
    getBatchMetrics(eventId),
  ]);

  return {
    ...enrolled,
    ...flights,
    ...visas,
    ...hotels,
    ...transport,
    ...preEvent,
    ...tasks,
    ...batches,
  };
}

async function getEnrolledMetrics(eventId: string) {
  const { data, error } = await supabase
    .from('mma_enrolled')
    .select('id, person:mma_people!inner(role)')
    .eq('event_id', eventId);

  if (error) throw error;

  const enrolled = data || [];

  return {
    total_enrolled: enrolled.length,
    fighters: enrolled.filter(e => e.person.role?.toLowerCase() === 'fighter').length,
    staff: enrolled.filter(e => e.person.role?.toLowerCase() === 'staff').length,
    vips: enrolled.filter(e => e.person.role?.toLowerCase() === 'vip').length,
  };
}

async function getFlightMetrics(eventId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: flights, error: flightsError } = await supabase
    .from('mma_flights')
    .select('id, flight_type, arrival_datetime, departure_datetime')
    .eq('event_id', eventId);

  if (flightsError) throw flightsError;

  const { data: tickets, error: ticketsError } = await supabase
    .from('mma_flight_tickets')
    .select('id, status')
    .eq('event_id', eventId);

  if (ticketsError) throw ticketsError;

  const flightList = flights || [];
  const ticketList = tickets || [];

  return {
    total_flights: flightList.length,
    arrivals_today: flightList.filter(f => 
      f.arrival_datetime?.startsWith(today)
    ).length,
    departures_today: flightList.filter(f => 
      f.departure_datetime?.startsWith(today)
    ).length,
    pending_tickets: ticketList.filter(t => t.status === 'pending').length,
  };
}

async function getVisaMetrics(eventId: string) {
  const { data, error } = await supabase
    .from('mma_visas')
    .select('id, status')
    .eq('event_id', eventId);

  if (error) throw error;

  const visas = data || [];

  return {
    total_visas: visas.length,
    visas_approved: visas.filter(v => v.status === 5 || v.status === 6).length,
    visas_pending: visas.filter(v => v.status >= 1 && v.status <= 4).length,
    visas_denied: visas.filter(v => v.status === 0).length,
  };
}

async function getHotelMetrics(eventId: string) {
  const { data, error } = await supabase
    .from('mma_hotels')
    .select('id, status, has_divergence, divergence_approved')
    .eq('event_id', eventId);

  if (error) throw error;

  const hotels = data || [];

  return {
    total_reservations: hotels.length,
    hotels_confirmed: hotels.filter(h => h.status === 'confirmed').length,
    hotels_pending: hotels.filter(h => h.status === 'pending').length,
    divergences_pending: hotels.filter(h => h.has_divergence && !h.divergence_approved).length,
  };
}

async function getTransportMetrics(eventId: string) {
  const { data: cars, error: carsError } = await supabase
    .from('mma_event_cars')
    .select('id')
    .eq('event_id', eventId);

  if (carsError) throw carsError;

  const { data: passengers, error: passengersError } = await supabase
    .from('mma_car_passengers')
    .select('id, transport_type, car:mma_event_cars!inner(event_id)')
    .eq('car.event_id', eventId);

  if (passengersError) throw passengersError;

  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrolled')
    .select('id, arrival_flight_id, departure_flight_id')
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  const passengerList = passengers || [];
  const enrolledList = enrolled || [];
  
  const assignedArrivals = new Set(passengerList.filter(p => p.transport_type === 'arrival').map(p => p.id));
  const assignedDepartures = new Set(passengerList.filter(p => p.transport_type === 'departure').map(p => p.id));
  
  const needsArrival = enrolledList.filter(e => e.arrival_flight_id).length;
  const needsDeparture = enrolledList.filter(e => e.departure_flight_id).length;

  return {
    total_cars: cars?.length || 0,
    arrivals_assigned: assignedArrivals.size,
    departures_assigned: assignedDepartures.size,
    unassigned_transport: (needsArrival - assignedArrivals.size) + (needsDeparture - assignedDepartures.size),
  };
}

async function getPreEventMetrics(eventId: string) {
  const { data, error } = await supabase
    .from('mma_pre_event_clearance')
    .select('status')
    .eq('event_id', eventId);

  if (error) throw error;

  const clearances = data || [];

  return {
    clearance_complete: clearances.filter(c => c.status === 'cleared').length,
    clearance_partial: clearances.filter(c => c.status === 'partial').length,
    clearance_pending: clearances.filter(c => c.status === 'pending').length,
    clearance_denied: clearances.filter(c => c.status === 'denied').length,
  };
}

async function getTaskMetrics(eventId: string) {
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .select('id, status, due_date')
    .eq('event_id', eventId);

  if (error) throw error;

  const tasks = data || [];
  const now = new Date();

  return {
    total_tasks: tasks.length,
    tasks_completed: tasks.filter(t => t.status === 'completed').length,
    tasks_in_progress: tasks.filter(t => t.status === 'in_progress').length,
    tasks_overdue: tasks.filter(t => 
      t.status !== 'completed' && 
      t.status !== 'cancelled' && 
      t.due_date && 
      isBefore(new Date(t.due_date), now)
    ).length,
  };
}

async function getBatchMetrics(eventId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('mma_batches')
    .select('id, status, scheduled_date')
    .eq('event_id', eventId);

  if (error) throw error;

  const batches = data || [];

  return {
    total_batches: batches.length,
    batches_today: batches.filter(b => b.scheduled_date === today).length,
    batches_completed: batches.filter(b => b.status === 'completed').length,
  };
}

function calculateModuleStatuses(metrics: EventMetrics): ModuleStatus[] {
  return [
    {
      module: 'enrolled',
      label: 'People',
      icon: 'Users',
      total: metrics.total_enrolled,
      completed: metrics.total_enrolled,
      pending: 0,
      alerts: 0,
      progress: 100,
      status: 'good',
    },
    {
      module: 'flights',
      label: 'Flights',
      icon: 'Plane',
      total: metrics.total_flights,
      completed: metrics.total_flights - metrics.pending_tickets,
      pending: metrics.pending_tickets,
      alerts: metrics.pending_tickets > 5 ? metrics.pending_tickets : 0,
      progress: metrics.total_flights > 0 
        ? ((metrics.total_flights - metrics.pending_tickets) / metrics.total_flights) * 100 
        : 0,
      status: metrics.pending_tickets > 5 ? 'warning' : 'good',
    },
    {
      module: 'visas',
      label: 'Visas',
      icon: 'FileCheck',
      total: metrics.total_visas,
      completed: metrics.visas_approved,
      pending: metrics.visas_pending,
      alerts: metrics.visas_denied,
      progress: metrics.total_visas > 0 
        ? (metrics.visas_approved / metrics.total_visas) * 100 
        : 0,
      status: metrics.visas_denied > 0 ? 'critical' : metrics.visas_pending > 5 ? 'warning' : 'good',
    },
    {
      module: 'hotels',
      label: 'Hotels',
      icon: 'Hotel',
      total: metrics.total_reservations,
      completed: metrics.hotels_confirmed,
      pending: metrics.hotels_pending,
      alerts: metrics.divergences_pending,
      progress: metrics.total_reservations > 0 
        ? (metrics.hotels_confirmed / metrics.total_reservations) * 100 
        : 0,
      status: metrics.divergences_pending > 3 ? 'warning' : 'good',
    },
    {
      module: 'transport',
      label: 'Transport',
      icon: 'Car',
      total: metrics.arrivals_assigned + metrics.departures_assigned + metrics.unassigned_transport,
      completed: metrics.arrivals_assigned + metrics.departures_assigned,
      pending: metrics.unassigned_transport,
      alerts: metrics.unassigned_transport > 10 ? metrics.unassigned_transport : 0,
      progress: (metrics.arrivals_assigned + metrics.departures_assigned + metrics.unassigned_transport) > 0
        ? ((metrics.arrivals_assigned + metrics.departures_assigned) / 
           (metrics.arrivals_assigned + metrics.departures_assigned + metrics.unassigned_transport)) * 100
        : 0,
      status: metrics.unassigned_transport > 10 ? 'warning' : 'good',
    },
    {
      module: 'pre-event',
      label: 'Pre-Event',
      icon: 'ClipboardCheck',
      total: metrics.clearance_complete + metrics.clearance_partial + metrics.clearance_pending + metrics.clearance_denied,
      completed: metrics.clearance_complete,
      pending: metrics.clearance_pending + metrics.clearance_partial,
      alerts: metrics.clearance_denied,
      progress: (metrics.clearance_complete + metrics.clearance_partial + metrics.clearance_pending + metrics.clearance_denied) > 0
        ? (metrics.clearance_complete / 
           (metrics.clearance_complete + metrics.clearance_partial + metrics.clearance_pending + metrics.clearance_denied)) * 100
        : 0,
      status: metrics.clearance_denied > 0 ? 'critical' : metrics.clearance_pending > 5 ? 'warning' : 'good',
    },
    {
      module: 'tasks',
      label: 'Tasks',
      icon: 'ListTodo',
      total: metrics.total_tasks,
      completed: metrics.tasks_completed,
      pending: metrics.total_tasks - metrics.tasks_completed,
      alerts: metrics.tasks_overdue,
      progress: metrics.total_tasks > 0 
        ? (metrics.tasks_completed / metrics.total_tasks) * 100 
        : 0,
      status: metrics.tasks_overdue > 0 ? 'critical' : 'good',
    },
  ];
}

export async function getUpcomingDeadlines(eventId: string, limit: number = 10): Promise<UpcomingDeadline[]> {
  const deadlines: UpcomingDeadline[] = [];
  const now = new Date();
  const nextWeek = addDays(now, 7);

  // Flights arriving/departing soon
  const { data: flights } = await supabase
    .from('mma_flights')
    .select('id, flight_number, arrival_datetime, departure_datetime, flight_type')
    .eq('event_id', eventId)
    .or(`arrival_datetime.gte.${now.toISOString()},departure_datetime.gte.${now.toISOString()}`)
    .order('arrival_datetime', { ascending: true })
    .limit(5);

  flights?.forEach(flight => {
    const datetime = flight.arrival_datetime || flight.departure_datetime;
    if (datetime) {
      deadlines.push({
        id: `flight-${flight.id}`,
        type: 'flight',
        title: `Flight ${flight.flight_number}`,
        description: flight.flight_type === 'arrival' ? 'Arriving' : 'Departing',
        datetime,
        urgency: isToday(new Date(datetime)) ? 'critical' : isTomorrow(new Date(datetime)) ? 'high' : 'medium',
        link: `/events/${eventId}/flights`,
      });
    }
  });

  // Batches scheduled
  const { data: batches } = await supabase
    .from('mma_batches')
    .select('id, name, scheduled_date, start_time, batch_type')
    .eq('event_id', eventId)
    .gte('scheduled_date', now.toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(5);

  batches?.forEach(batch => {
    const datetime = `${batch.scheduled_date}T${batch.start_time}`;
    deadlines.push({
      id: `batch-${batch.id}`,
      type: 'batch',
      title: batch.name,
      description: `${batch.batch_type} batch`,
      datetime,
      urgency: isToday(new Date(datetime)) ? 'high' : 'medium',
      link: `/events/${eventId}/batches`,
    });
  });

  // Overdue tasks
  const { data: tasks } = await supabase
    .from('mma_event_tasks')
    .select('id, name, due_date, due_time, priority')
    .eq('event_id', eventId)
    .not('status', 'in', '("completed","cancelled")')
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })
    .limit(5);

  tasks?.forEach(task => {
    const datetime = task.due_time 
      ? `${task.due_date}T${task.due_time}` 
      : `${task.due_date}T23:59:59`;
    const isOverdue = isBefore(new Date(datetime), now);
    
    deadlines.push({
      id: `task-${task.id}`,
      type: 'task',
      title: task.name,
      description: isOverdue ? 'OVERDUE' : 'Due',
      datetime,
      urgency: isOverdue ? 'critical' : task.priority === 'urgent' ? 'high' : 'medium',
      link: `/events/${eventId}/tasks`,
    });
  });

  // Sort by datetime and return
  return deadlines
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, limit);
}

export async function getRecentActivity(eventId: string, limit: number = 20): Promise<ActivityItem[]> {
  // This would ideally come from an activity log table
  // For now, we'll construct from recent changes
  const activities: ActivityItem[] = [];

  // Recent enrolled
  const { data: recentEnrolled } = await supabase
    .from('mma_enrolled')
    .select('id, created_at, person:mma_people!inner(full_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(5);

  recentEnrolled?.forEach(e => {
    activities.push({
      id: `enrolled-${e.id}`,
      type: 'enrolled',
      action: 'added',
      subject: e.person.full_name,
      timestamp: e.created_at,
    });
  });

  // Recent task updates
  const { data: recentTasks } = await supabase
    .from('mma_event_tasks')
    .select('id, name, status, updated_at')
    .eq('event_id', eventId)
    .order('updated_at', { ascending: false })
    .limit(5);

  recentTasks?.forEach(t => {
    activities.push({
      id: `task-${t.id}`,
      type: 'task',
      action: t.status === 'completed' ? 'completed' : 'updated',
      subject: t.name,
      timestamp: t.updated_at,
    });
  });

  // Sort by timestamp
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
```

---

## 🔧 War Room Service

### File: `src/lib/services/war-room-service.ts`

```typescript
import { createClient } from '@/lib/supabase/client';
import { LiveStatus, WarRoomAlert, QuickToggle } from '@/types/war-room';
import { getEventMetrics } from './dashboard-service';

const supabase = createClient();

export async function getLiveStatuses(eventId: string): Promise<LiveStatus[]> {
  const metrics = await getEventMetrics(eventId);
  
  const statuses: LiveStatus[] = [
    {
      id: 'enrolled',
      category: 'People',
      label: 'Total Enrolled',
      value: metrics.total_enrolled,
      status: 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'flights-today',
      category: 'Flights',
      label: 'Arrivals Today',
      value: metrics.arrivals_today,
      status: metrics.arrivals_today > 0 ? 'warning' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'departures-today',
      category: 'Flights',
      label: 'Departures Today',
      value: metrics.departures_today,
      status: metrics.departures_today > 0 ? 'warning' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'pending-tickets',
      category: 'Flights',
      label: 'Pending Tickets',
      value: metrics.pending_tickets,
      status: metrics.pending_tickets > 5 ? 'critical' : metrics.pending_tickets > 0 ? 'warning' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'hotels-pending',
      category: 'Hotels',
      label: 'Pending Reservations',
      value: metrics.hotels_pending,
      status: metrics.hotels_pending > 5 ? 'warning' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'divergences',
      category: 'Hotels',
      label: 'Pending Divergences',
      value: metrics.divergences_pending,
      status: metrics.divergences_pending > 0 ? 'warning' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'unassigned-transport',
      category: 'Transport',
      label: 'Unassigned',
      value: metrics.unassigned_transport,
      status: metrics.unassigned_transport > 10 ? 'critical' : metrics.unassigned_transport > 0 ? 'warning' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tasks-overdue',
      category: 'Tasks',
      label: 'Overdue Tasks',
      value: metrics.tasks_overdue,
      status: metrics.tasks_overdue > 0 ? 'critical' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'clearance-pending',
      category: 'Pre-Event',
      label: 'Pending Clearance',
      value: metrics.clearance_pending,
      status: metrics.clearance_pending > 5 ? 'warning' : 'good',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'clearance-denied',
      category: 'Pre-Event',
      label: 'Denied Clearance',
      value: metrics.clearance_denied,
      status: metrics.clearance_denied > 0 ? 'critical' : 'good',
      updated_at: new Date().toISOString(),
    },
  ];

  return statuses;
}

export async function getWarRoomAlerts(eventId: string): Promise<WarRoomAlert[]> {
  const alerts: WarRoomAlert[] = [];
  const metrics = await getEventMetrics(eventId);

  // Check for critical conditions
  if (metrics.tasks_overdue > 0) {
    alerts.push({
      id: 'overdue-tasks',
      severity: 'error',
      title: 'Overdue Tasks',
      message: `${metrics.tasks_overdue} task(s) are past their due date`,
      source: 'tasks',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (metrics.clearance_denied > 0) {
    alerts.push({
      id: 'denied-clearance',
      severity: 'critical',
      title: 'Denied Clearances',
      message: `${metrics.clearance_denied} participant(s) have been denied clearance`,
      source: 'pre-event',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (metrics.visas_denied > 0) {
    alerts.push({
      id: 'denied-visas',
      severity: 'critical',
      title: 'Denied Visas',
      message: `${metrics.visas_denied} visa(s) have been denied`,
      source: 'visas',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (metrics.unassigned_transport > 10) {
    alerts.push({
      id: 'unassigned-transport',
      severity: 'warning',
      title: 'Unassigned Transport',
      message: `${metrics.unassigned_transport} participants need transport assignment`,
      source: 'transport',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (metrics.divergences_pending > 3) {
    alerts.push({
      id: 'pending-divergences',
      severity: 'warning',
      title: 'Pending Hotel Divergences',
      message: `${metrics.divergences_pending} hotel divergences need approval`,
      source: 'hotels',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export async function getQuickToggles(eventId: string): Promise<QuickToggle[]> {
  const toggles: QuickToggle[] = [];

  // Get recent tasks that can be toggled
  const { data: tasks } = await supabase
    .from('mma_event_tasks')
    .select('id, name, status')
    .eq('event_id', eventId)
    .in('status', ['pending', 'in_progress'])
    .order('priority', { ascending: false })
    .limit(5);

  tasks?.forEach(task => {
    toggles.push({
      id: `task-${task.id}`,
      entity_type: 'task',
      entity_id: task.id,
      label: task.name,
      current_status: task.status,
      available_statuses: ['pending', 'in_progress', 'completed'],
      last_updated: new Date().toISOString(),
    });
  });

  // Get active batches
  const { data: batches } = await supabase
    .from('mma_batches')
    .select('id, name, status')
    .eq('event_id', eventId)
    .in('status', ['scheduled', 'in_progress'])
    .order('scheduled_date')
    .order('start_time')
    .limit(5);

  batches?.forEach(batch => {
    toggles.push({
      id: `batch-${batch.id}`,
      entity_type: 'batch',
      entity_id: batch.id,
      label: batch.name,
      current_status: batch.status,
      available_statuses: ['scheduled', 'in_progress', 'completed'],
      last_updated: new Date().toISOString(),
    });
  });

  return toggles;
}

export async function updateQuickToggle(
  entityType: string,
  entityId: string,
  newStatus: string
): Promise<void> {
  const tableMap: Record<string, string> = {
    task: 'mma_event_tasks',
    batch: 'mma_batches',
    hotel: 'mma_hotels',
  };

  const table = tableMap[entityType];
  if (!table) throw new Error('Invalid entity type');

  const updateData: Record<string, unknown> = { status: newStatus };

  // Add timestamps for specific statuses
  if (entityType === 'task') {
    if (newStatus === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
  }

  if (entityType === 'batch') {
    if (newStatus === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', entityId);

  if (error) throw new Error(`Failed to update ${entityType}`);
}

export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  // In a real implementation, this would update an alerts table
  // For now, we'll just log it
  console.log(`Alert ${alertId} acknowledged by ${userId}`);
}
```

---

## 🎨 Dashboard Components

### File: `src/components/dashboard/metrics-grid.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventMetrics } from '@/types/dashboard';
import { 
  Users, 
  Plane, 
  FileCheck, 
  Hotel, 
  Car, 
  ClipboardCheck, 
  ListTodo,
  Calendar 
} from 'lucide-react';

interface MetricsGridProps {
  metrics: EventMetrics;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const metricCards = [
    {
      title: 'Total Enrolled',
      value: metrics.total_enrolled,
      subtitle: `${metrics.fighters} fighters, ${metrics.staff} staff`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Flights',
      value: metrics.total_flights,
      subtitle: `${metrics.arrivals_today} arriving, ${metrics.departures_today} departing today`,
      icon: Plane,
      color: 'text-cyan-600',
    },
    {
      title: 'Visas',
      value: `${metrics.visas_approved}/${metrics.total_visas}`,
      subtitle: `${metrics.visas_pending} pending, ${metrics.visas_denied} denied`,
      icon: FileCheck,
      color: 'text-green-600',
    },
    {
      title: 'Hotels',
      value: `${metrics.hotels_confirmed}/${metrics.total_reservations}`,
      subtitle: `${metrics.hotels_pending} pending, ${metrics.divergences_pending} divergences`,
      icon: Hotel,
      color: 'text-purple-600',
    },
    {
      title: 'Transport',
      value: metrics.total_cars,
      subtitle: `${metrics.unassigned_transport} unassigned passengers`,
      icon: Car,
      color: 'text-orange-600',
    },
    {
      title: 'Pre-Event',
      value: `${metrics.clearance_complete}/${metrics.clearance_complete + metrics.clearance_partial + metrics.clearance_pending}`,
      subtitle: `${metrics.clearance_pending} pending clearance`,
      icon: ClipboardCheck,
      color: 'text-teal-600',
    },
    {
      title: 'Tasks',
      value: `${metrics.tasks_completed}/${metrics.total_tasks}`,
      subtitle: `${metrics.tasks_in_progress} in progress, ${metrics.tasks_overdue} overdue`,
      icon: ListTodo,
      color: 'text-yellow-600',
    },
    {
      title: 'Batches',
      value: metrics.total_batches,
      subtitle: `${metrics.batches_today} today, ${metrics.batches_completed} completed`,
      icon: Calendar,
      color: 'text-pink-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metricCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

### File: `src/components/dashboard/status-card.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ModuleStatus } from '@/types/dashboard';
import { 
  Users, 
  Plane, 
  FileCheck, 
  Hotel, 
  Car, 
  ClipboardCheck, 
  ListTodo,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface StatusCardProps {
  status: ModuleStatus;
  onClick?: () => void;
}

const iconMap: Record<string, typeof Users> = {
  Users,
  Plane,
  FileCheck,
  Hotel,
  Car,
  ClipboardCheck,
  ListTodo,
};

const statusColors = {
  good: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function StatusCard({ status, onClick }: StatusCardProps) {
  const Icon = iconMap[status.icon] || Users;
  const colorClass = statusColors[status.status];

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{status.label}</CardTitle>
          </div>
          {status.alerts > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {status.alerts}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(status.progress)}%</span>
        </div>
        <Progress value={status.progress} className="h-2" />
        
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span>{status.completed} done</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-yellow-600" />
            <span>{status.pending} pending</span>
          </div>
        </div>

        <Badge variant="outline" className={colorClass}>
          {status.status === 'good' && 'On Track'}
          {status.status === 'warning' && 'Needs Attention'}
          {status.status === 'critical' && 'Critical'}
          {status.status === 'neutral' && 'Neutral'}
        </Badge>
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/dashboard/upcoming-deadlines.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { UpcomingDeadline } from '@/types/dashboard';
import { 
  Plane, 
  Calendar, 
  ListTodo, 
  FileCheck, 
  Hotel, 
  Stethoscope,
  Clock,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface UpcomingDeadlinesProps {
  deadlines: UpcomingDeadline[];
  eventId: string;
}

const typeIcons: Record<string, typeof Plane> = {
  flight: Plane,
  batch: Calendar,
  task: ListTodo,
  visa: FileCheck,
  hotel: Hotel,
  medical: Stethoscope,
};

const urgencyColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

export function UpcomingDeadlines({ deadlines, eventId }: UpcomingDeadlinesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {deadlines.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No upcoming deadlines
            </p>
          ) : (
            <div className="space-y-3">
              {deadlines.map((deadline) => {
                const Icon = typeIcons[deadline.type] || Clock;
                const date = new Date(deadline.datetime);
                const isOverdue = isPast(date);
                
                return (
                  <Link 
                    key={deadline.id}
                    href={deadline.link || `/events/${eventId}`}
                    className="block"
                  >
                    <div className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                      <div className={`p-2 rounded-full ${urgencyColors[deadline.urgency]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{deadline.title}</p>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{deadline.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isToday(date) && 'Today, '}
                          {isTomorrow(date) && 'Tomorrow, '}
                          {format(date, 'MMM dd, HH:mm')}
                          {' • '}
                          {formatDistanceToNow(date, { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className={urgencyColors[deadline.urgency]}>
                        {deadline.urgency}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/dashboard/quick-actions.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  UserPlus, 
  PlaneTakeoff, 
  Hotel, 
  Car, 
  ClipboardPlus, 
  Calendar,
  Radio,
  FileText
} from 'lucide-react';

interface QuickActionsProps {
  eventId: string;
}

export function QuickActions({ eventId }: QuickActionsProps) {
  const actions = [
    {
      label: 'Add Person',
      icon: UserPlus,
      href: `/events/${eventId}/enrolled?action=add`,
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    },
    {
      label: 'Add Flight',
      icon: PlaneTakeoff,
      href: `/events/${eventId}/flights?action=add`,
      color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
    },
    {
      label: 'Add Hotel',
      icon: Hotel,
      href: `/events/${eventId}/hotels?action=add`,
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    },
    {
      label: 'Add Car',
      icon: Car,
      href: `/events/${eventId}/transport?action=add`,
      color: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    },
    {
      label: 'New Task',
      icon: ClipboardPlus,
      href: `/events/${eventId}/tasks?action=add`,
      color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    },
    {
      label: 'New Batch',
      icon: Calendar,
      href: `/events/${eventId}/batches?action=add`,
      color: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
    },
    {
      label: 'War Room',
      icon: Radio,
      href: `/events/${eventId}/war-room`,
      color: 'bg-red-100 text-red-700 hover:bg-red-200',
    },
    {
      label: 'Reports',
      icon: FileText,
      href: `/events/${eventId}/reports`,
      color: 'bg-green-100 text-green-700 hover:bg-green-200',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Button
                  variant="ghost"
                  className={`w-full h-auto flex-col gap-2 py-4 ${action.color}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/dashboard/dashboard-header.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';
import { Calendar, MapPin, Radio, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface DashboardHeaderProps {
  event: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
    status: string;
  };
  onRefresh: () => void;
  isLoading: boolean;
}

export function DashboardHeader({ event, onRefresh, isLoading }: DashboardHeaderProps) {
  const daysUntil = differenceInDays(new Date(event.start_date), new Date());
  const isUpcoming = daysUntil > 0;
  const isOngoing = daysUntil <= 0 && differenceInDays(new Date(event.end_date), new Date()) >= 0;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <Badge variant={isOngoing ? 'default' : isUpcoming ? 'secondary' : 'outline'}>
            {isOngoing ? 'Live' : isUpcoming ? `${daysUntil} days` : 'Completed'}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.start_date), 'MMM dd')} - {format(new Date(event.end_date), 'MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Link href={`/events/${event.id}/war-room`}>
          <Button size="sm" className="bg-red-600 hover:bg-red-700">
            <Radio className="h-4 w-4 mr-2" />
            War Room
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

---

## 🎨 War Room Components

### File: `src/components/war-room/war-room-layout.tsx`

```typescript
'use client';

import { ReactNode } from 'react';
import { RealtimeProvider } from '@/lib/realtime/realtime-provider';

interface WarRoomLayoutProps {
  eventId: string;
  children: ReactNode;
}

export function WarRoomLayout({ eventId, children }: WarRoomLayoutProps) {
  return (
    <RealtimeProvider eventId={eventId}>
      <div className="h-screen flex flex-col bg-slate-900 text-white">
        {children}
      </div>
    </RealtimeProvider>
  );
}
```

### File: `src/components/war-room/live-status-board.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiveStatus } from '@/types/war-room';
import { formatDistanceToNow } from 'date-fns';

interface LiveStatusBoardProps {
  statuses: LiveStatus[];
}

const statusColors = {
  good: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500 animate-pulse',
};

export function LiveStatusBoard({ statuses }: LiveStatusBoardProps) {
  // Group by category
  const grouped = statuses.reduce((acc, status) => {
    if (!acc[status.category]) {
      acc[status.category] = [];
    }
    acc[status.category].push(status);
    return acc;
  }, {} as Record<string, LiveStatus[]>);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((status) => (
              <div key={status.id} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{status.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{status.value}</span>
                  <div className={`w-2 h-2 rounded-full ${statusColors[status.status]}`} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### File: `src/components/war-room/activity-feed.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { RealtimeUpdate } from '@/types/war-room';
import { Activity, Plus, Pencil, Trash2 } from 'lucide-react';

interface ActivityFeedProps {
  updates: RealtimeUpdate[];
}

const actionIcons = {
  insert: Plus,
  update: Pencil,
  delete: Trash2,
};

const actionColors = {
  insert: 'bg-green-500/20 text-green-400',
  update: 'bg-blue-500/20 text-blue-400',
  delete: 'bg-red-500/20 text-red-400',
};

export function ActivityFeed({ updates }: ActivityFeedProps) {
  return (
    <Card className="bg-slate-800 border-slate-700 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Live Activity
          <Badge variant="outline" className="ml-auto text-xs">
            {updates.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {updates.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              Waiting for activity...
            </p>
          ) : (
            <div className="space-y-2">
              {updates.map((update) => {
                const Icon = actionIcons[update.type];
                const colorClass = actionColors[update.type];

                return (
                  <div
                    key={update.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-slate-700/50"
                  >
                    <div className={`p-1.5 rounded ${colorClass}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-slate-400">
                          {update.channel}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {update.table.replace('mma_', '')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 truncate mt-1">
                        {update.type === 'delete' ? 'Record deleted' : 
                          JSON.stringify(update.record).substring(0, 50) + '...'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/war-room/alerts-panel.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { WarRoomAlert } from '@/types/war-room';
import { AlertTriangle, AlertCircle, Info, XCircle, Check } from 'lucide-react';

interface AlertsPanelProps {
  alerts: WarRoomAlert[];
  onAcknowledge: (alertId: string) => void;
}

const severityConfig = {
  info: { icon: Info, color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  error: { icon: AlertCircle, color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  critical: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' },
};

export function AlertsPanel({ alerts, onAcknowledge }: AlertsPanelProps) {
  const unacknowledged = alerts.filter(a => !a.acknowledged);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Alerts
          {unacknowledged.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {unacknowledged.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {alerts.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No alerts
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${config.color} ${alert.acknowledged ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {alert.source}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-80 mt-1">{alert.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-60">
                            {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          </span>
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => onAcknowledge(alert.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/war-room/team-presence.tsx`

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TeamMember } from '@/types/war-room';
import { Users } from 'lucide-react';

interface TeamPresenceProps {
  members: TeamMember[];
}

export function TeamPresence({ members }: TeamPresenceProps) {
  const onlineMembers = members.filter(m => m.status === 'online');

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Online
          <Badge variant="secondary" className="ml-auto">
            {onlineMembers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-center text-slate-500 py-4 text-sm">
            No team members online
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/50"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-600 text-xs">
                      {member.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800 ${
                    member.status === 'online' ? 'bg-green-500' :
                    member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{member.name}</p>
                  {member.current_section && (
                    <p className="text-xs text-slate-500">{member.current_section}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### File: `src/components/war-room/countdown-timer.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';

interface CountdownTimerProps {
  targetDate: string;
  label: string;
}

export function CountdownTimer({ targetDate, label }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(targetDate);

    const updateTimer = () => {
      const now = new Date();
      
      if (now >= target) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;
      const seconds = differenceInSeconds(target, now) % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const isLive = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <Card className="bg-gradient-to-r from-red-900 to-red-800 border-red-700">
      <CardContent className="py-4">
        <p className="text-center text-red-200 text-sm mb-2">{label}</p>
        {isLive ? (
          <div className="text-center">
            <span className="text-4xl font-bold text-white animate-pulse">LIVE NOW</span>
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            <TimeUnit value={timeLeft.days} label="DAYS" />
            <TimeUnit value={timeLeft.hours} label="HRS" />
            <TimeUnit value={timeLeft.minutes} label="MIN" />
            <TimeUnit value={timeLeft.seconds} label="SEC" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-mono font-bold text-white">
        {value.toString().padStart(2, '0')}
      </div>
      <div className="text-xs text-red-300">{label}</div>
    </div>
  );
}
```

---

## 📄 Pages

### File: `src/app/(dashboard)/events/[eventId]/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { StatusCard } from '@/components/dashboard/status-card';
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { DashboardData } from '@/types/dashboard';
import { getDashboardData } from '@/lib/services/dashboard-service';

export default function EventDashboardPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dashboardData = await getDashboardData(eventId);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader 
        event={data.event} 
        onRefresh={loadData} 
        isLoading={isLoading} 
      />

      {/* Quick Actions */}
      <QuickActions eventId={eventId} />

      {/* Metrics Grid */}
      <MetricsGrid metrics={data.metrics} />

      {/* Module Status Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Module Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.modules.map((module) => (
            <StatusCard key={module.module} status={module} />
          ))}
        </div>
      </div>

      {/* Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingDeadlines deadlines={data.deadlines} eventId={eventId} />
        
        {/* Activity placeholder */}
        <div className="bg-muted/50 rounded-lg p-6 flex items-center justify-center">
          <p className="text-muted-foreground">Recent activity coming soon...</p>
        </div>
      </div>
    </div>
  );
}
```

### File: `src/app/(dashboard)/events/[eventId]/war-room/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WarRoomLayout } from '@/components/war-room/war-room-layout';
import { LiveStatusBoard } from '@/components/war-room/live-status-board';
import { ActivityFeed } from '@/components/war-room/activity-feed';
import { AlertsPanel } from '@/components/war-room/alerts-panel';
import { TeamPresence } from '@/components/war-room/team-presence';
import { CountdownTimer } from '@/components/war-room/countdown-timer';
import { useRealtime } from '@/lib/realtime/use-realtime';
import { useRealtimeContext } from '@/lib/realtime/realtime-provider';
import { LiveStatus, WarRoomAlert, RealtimeUpdate } from '@/types/war-room';
import { getLiveStatuses, getWarRoomAlerts, acknowledgeAlert } from '@/lib/services/war-room-service';
import { getEventById } from '@/lib/services/event-service';
import { Radio, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WarRoomPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [statuses, setStatuses] = useState<LiveStatus[]>([]);
  const [alerts, setAlerts] = useState<WarRoomAlert[]>([]);
  const [eventInfo, setEventInfo] = useState<{ name: string; start_date: string } | null>(null);

  // Realtime hook
  const { isConnected, updates } = useRealtime({
    eventId,
    onUpdate: (update) => {
      // Refresh statuses on any update
      loadStatuses();
    },
  });

  const loadStatuses = useCallback(async () => {
    try {
      const [statusData, alertData] = await Promise.all([
        getLiveStatuses(eventId),
        getWarRoomAlerts(eventId),
      ]);
      setStatuses(statusData);
      setAlerts(alertData);
    } catch (error) {
      console.error('Failed to load war room data:', error);
    }
  }, [eventId]);

  const loadEventInfo = useCallback(async () => {
    try {
      const event = await getEventById(eventId);
      if (event) {
        setEventInfo({ name: event.name, start_date: event.start_date });
      }
    } catch (error) {
      console.error('Failed to load event info:', error);
    }
  }, [eventId]);

  useEffect(() => {
    loadStatuses();
    loadEventInfo();

    // Refresh every 10 seconds
    const interval = setInterval(loadStatuses, 10000);
    return () => clearInterval(interval);
  }, [loadStatuses, loadEventInfo]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId, 'current-user-id');
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      ));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  // Mock team members for now
  const teamMembers = [
    { id: '1', name: 'Admin', role: 'Admin', status: 'online' as const, current_section: 'War Room', last_seen: new Date().toISOString() },
  ];

  return (
    <WarRoomLayout eventId={eventId}>
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/events/${eventId}`}>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Radio className="h-6 w-6 text-red-500" />
              <h1 className="text-xl font-bold">War Room</h1>
              {eventInfo && (
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {eventInfo.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-500">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Countdown */}
        {eventInfo && (
          <CountdownTimer 
            targetDate={eventInfo.start_date} 
            label="Event Starts In" 
          />
        )}

        {/* Live Status Board */}
        <LiveStatusBoard statuses={statuses} />

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <ActivityFeed updates={updates} />

          {/* Alerts */}
          <AlertsPanel 
            alerts={alerts} 
            onAcknowledge={handleAcknowledgeAlert} 
          />

          {/* Team Presence */}
          <TeamPresence members={teamMembers} />
        </div>
      </div>
    </WarRoomLayout>
  );
}
```

---

## 🚀 Deploy Configuration

### File: `src/config/deploy.ts`

```typescript
export const deployConfig = {
  // Vercel
  vercel: {
    projectName: 'mma-event-management',
    framework: 'nextjs',
    buildCommand: 'npm run build',
    outputDirectory: '.next',
    installCommand: 'npm install',
    devCommand: 'npm run dev',
  },

  // Environment Variables (to be set in Vercel)
  envVariables: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ],

  // Production URLs
  urls: {
    production: 'https://your-domain.com',
    staging: 'https://staging.your-domain.com',
  },
};

export const securityChecklist = [
  { id: 'rls', label: 'Row Level Security enabled on all tables', required: true },
  { id: 'env', label: 'Environment variables configured', required: true },
  { id: 'auth', label: 'Authentication tested', required: true },
  { id: 'https', label: 'HTTPS enforced', required: true },
  { id: 'cors', label: 'CORS configured correctly', required: true },
  { id: 'rate-limit', label: 'Rate limiting configured', required: false },
  { id: 'backup', label: 'Database backups enabled', required: true },
  { id: 'monitoring', label: 'Error monitoring setup', required: false },
];

export const performanceChecklist = [
  { id: 'images', label: 'Images optimized with next/image', required: true },
  { id: 'bundle', label: 'Bundle size analyzed', required: false },
  { id: 'caching', label: 'API responses cached where appropriate', required: false },
  { id: 'lazy-load', label: 'Components lazy loaded', required: false },
  { id: 'indexes', label: 'Database indexes created', required: true },
];
```

### File: `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ]
}
```

### File: `.env.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth (if using)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ Final Checklist

### Pre-Deploy Checklist

```markdown
## Pre-Deploy Checklist

### Database
- [ ] All migrations executed successfully
- [ ] RLS policies enabled and tested
- [ ] Indexes created for frequently queried columns
- [ ] Backup configured

### Authentication
- [ ] Email/password auth working
- [ ] Google OAuth configured (if using)
- [ ] Session management tested
- [ ] Password reset flow working

### Security
- [ ] Environment variables set in Vercel
- [ ] Service role key NOT exposed to client
- [ ] CORS configured correctly
- [ ] Input validation on all forms

### Performance
- [ ] Images using next/image
- [ ] Dynamic imports for large components
- [ ] API routes optimized
- [ ] Database queries efficient

### Testing
- [ ] All CRUD operations tested
- [ ] Authentication flows tested
- [ ] Realtime subscriptions tested
- [ ] Mobile responsiveness checked

### Deployment
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Domain configured (if custom)
- [ ] Preview deployments working
```

---

## 📚 Post-Deploy Steps

```markdown
## Post-Deploy Steps

1. **Verify Deployment**
   - Visit production URL
   - Test authentication
   - Check console for errors

2. **Configure Monitoring**
   - Set up Vercel Analytics
   - Configure error tracking (Sentry optional)

3. **Database Maintenance**
   - Enable Point-in-Time Recovery in Supabase
   - Set up automated backups

4. **Documentation**
   - Update README with production URL
   - Document any manual steps

5. **Team Access**
   - Add team members to Vercel project
   - Configure Supabase team access
```

---

## 🎉 Sprint Complete

This sprint completes the MMA Event Management System with:

1. **Dashboard** - Real-time event overview with metrics
2. **War Room** - Live operations center with WebSocket sync
3. **Deploy Config** - Production-ready Vercel deployment

The system is now ready for production deployment!
