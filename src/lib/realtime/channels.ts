import { RealtimeChannel } from '@supabase/supabase-js';

export const REALTIME_CHANNELS = {
  EVENT_UPDATES: (eventId: string) => `event:${eventId}`,
  WAR_ROOM: (eventId: string) => `war-room:${eventId}`,
  PRESENCE: (eventId: string) => `presence:${eventId}`,
} as const;

export const SUBSCRIBED_TABLES = [
  'mma_enrollments',
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
