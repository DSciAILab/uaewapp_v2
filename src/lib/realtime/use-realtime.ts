'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SUBSCRIBED_TABLES, SubscribedTable } from './channels';
import { RealtimeUpdate, WarRoomChannel } from '@/types/war-room';

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
      channel: mapTableToChannel(payload.table as SubscribedTable) as WarRoomChannel,
      type: payload.eventType as 'insert' | 'update' | 'delete',
      table: payload.table,
      record: (payload.new || {}) as Record<string, unknown>,
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
