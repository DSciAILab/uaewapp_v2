'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { TeamMember } from '@/types/war-room';
import { useUser } from '@/hooks/use-user';

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

// Define PresenceState type based on the structure expected from Supabase presence
// This is inferred from the original code's usage of `presence` object
interface PresenceState {
  name: string;
  role: string;
  section: string;
  online_at: string;
  // Add other properties if they exist in the presence object
}

export function RealtimeProvider({ eventId, children }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<TeamMember[]>([]);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    // Join the global presence channel
    const channel = supabase.channel(`presence:${eventId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineUsers: TeamMember[] = []; // Changed from PresenceState[] to TeamMember[] to match setActiveUsers
        
        for (const key in newState) {
          const state = newState[key] as unknown as PresenceState[];
          if (state && state.length > 0) {
            // Assuming the first presence object contains the user's details
            const presence = state[0];
            onlineUsers.push({
              id: key, // The key from newState is the user ID
              name: presence.name || 'Unknown',
              role: presence.role || 'User',
              status: 'online', // Assuming 'online' for active presence
              current_section: presence.section,
              last_seen: presence.online_at, // Using online_at as last_seen
            });
          }
        }
        
        setActiveUsers(onlineUsers); // Changed from setPresenceState to setActiveUsers
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: any }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string; leftPresences: any }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            name: user.name || user.email || user.id,
            role: user.user_type || 'staff', 
            section: 'dashboard',
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [eventId, user, supabase]);

  const broadcastPresence = async (section?: string) => {
    if (presenceChannelRef.current && user) {
      await presenceChannelRef.current.track({
        name: user.name || user.email || user.id,
        role: user.user_type || 'staff',
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
