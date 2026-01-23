'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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

export function RealtimeProvider({ eventId, children }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<TeamMember[]>([]);
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  
  const { user } = useUser();
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
            name: user.full_name || user.email || user.id,
            role: user.role_code || 'Admin', 
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
        name: user.full_name || user.email || user.id,
        role: user.role_code || 'Admin',
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
