'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Radio, 
  ShieldAlert, 
  Terminal,
  RefreshCcw,
  Maximize2
} from 'lucide-react';

import { WarRoomLayout } from '@/components/war-room/war-room-layout';
import { LiveStatusBoard } from '@/components/war-room/live-status-board';
import { ActivityFeed } from '@/components/war-room/activity-feed';
import { TeamPresence } from '@/components/war-room/team-presence';
import { AlertsPanel } from '@/components/war-room/alerts-panel';
import { CountdownTimer } from '@/components/war-room/countdown-timer';
import { useRealtime } from '@/lib/realtime/use-realtime';
import { useRealtimeContext, RealtimeProvider } from '@/lib/realtime/realtime-provider';
import { getEventById } from '@/lib/services/events';
import { getEventMetrics } from '@/lib/services/dashboard-service';
import { Event } from '@/types/database';
import { LiveStatus, WarRoomAlert } from '@/types/war-room';
import { cn } from '@/lib/utils';

type WarRoomView = 'tactical' | 'logistics' | 'safety';

function WarRoomContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<LiveStatus[]>([]);
  const [alerts, setAlerts] = useState<WarRoomAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTVMode, setIsTVMode] = useState(false);
  const [activeView, setActiveView] = useState<WarRoomView>('tactical');
  const [isRotating, setIsRotating] = useState(false);
  const [rotationInterval, setRotationInterval] = useState<NodeJS.Timeout | null>(null);

  const refreshMetrics = useCallback(async () => {
    try {
      const metrics = await getEventMetrics(eventId);
      
      const statuses: LiveStatus[] = [
        {
          id: '1',
          category: 'Logistics',
          label: 'Pending Tickets',
          value: metrics.pending_tickets,
          status: metrics.pending_tickets > 0 ? 'warning' : 'good',
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          category: 'Operations',
          label: 'Overdue Tasks',
          value: metrics.tasks_overdue,
          status: metrics.tasks_overdue > 0 ? 'critical' : 'good',
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          category: 'Safety',
          label: 'Medical/Blood Denied',
          value: metrics.clearance_denied,
          status: metrics.clearance_denied > 0 ? 'critical' : 'good',
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          category: 'Hotels',
          label: 'Divergences',
          value: metrics.divergences_pending,
          status: metrics.divergences_pending > 0 ? 'warning' : 'good',
          updated_at: new Date().toISOString()
        }
      ];
      
      setLiveStatuses(statuses);

      const newAlerts: WarRoomAlert[] = [];
      if (metrics.tasks_overdue > 0) {
        newAlerts.push({
          id: 'a1',
          severity: 'critical',
          title: 'System Task Failure',
          message: `${metrics.tasks_overdue} operations tasks overdue.`,
          source: 'OPS_ENGINE',
          timestamp: new Date().toISOString(),
          acknowledged: false
        });
      }
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Failed to refresh war room metrics:', error);
    }
  }, [eventId]);

  const { isConnected, updates } = useRealtime({
    eventId,
    onUpdate: () => {
      refreshMetrics();
    }
  });

  const { activeUsers, broadcastPresence } = useRealtimeContext();

  useEffect(() => {
    const init = async () => {
      const data = await getEventById(eventId);
      setEvent(data);
      await refreshMetrics();
      setLoading(false);
      broadcastPresence('war-room');
    };
    init();
  }, [eventId, broadcastPresence, refreshMetrics]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRotating) {
      interval = setInterval(() => {
        setActiveView((prev) => {
          if (prev === 'tactical') return 'logistics';
          if (prev === 'logistics') return 'safety';
          return 'tactical';
        });
      }, 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRotating]);

  const handleTVModeToggle = (enabled: boolean) => {
    setIsTVMode(enabled);
    setIsRotating(enabled);
    if (enabled) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  if (loading || !event) return null;

  return (
    <WarRoomLayout 
      title={`${event.name} • COMMAND CENTER`} 
      isTVMode={isTVMode} 
      onTVModeToggle={handleTVModeToggle}
    >
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {!isTVMode && (
          <div className="flex gap-2">
            {(['tactical', 'logistics', 'safety'] as WarRoomView[]).map((view) => (
              <Button
                key={view}
                variant={activeView === view ? 'default' : 'secondary'}
                size="sm"
                className="uppercase font-black text-[10px] tracking-widest px-6"
                onClick={() => {
                  setActiveView(view);
                  setIsRotating(false);
                }}
              >
                {view}
              </Button>
            ))}
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "uppercase font-black text-[10px] tracking-widest border-slate-700",
                isRotating ? "bg-primary/20 text-primary border-primary/50" : "text-slate-500"
              )}
              onClick={() => setIsRotating(!isRotating)}
            >
              {isRotating ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}
            </Button>
          </div>
        )}

        <div className="flex-1 relative overflow-hidden">
          {activeView === 'tactical' && (
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 gap-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="col-span-9 row-span-1">
                <LiveStatusBoard statuses={liveStatuses} />
              </div>
              <div className="col-span-3 row-span-1">
                <CountdownTimer targetDate={event.event_date} label="Live Event" />
              </div>
              <div className="col-span-6 row-span-5">
                <ActivityFeed updates={updates} />
              </div>
              <div className="col-span-3 row-span-3">
                <AlertsPanel alerts={alerts} />
              </div>
              <div className="col-span-3 row-span-2 space-y-4">
                <TeamPresence members={activeUsers} />
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Uptime</span>
                      <span className="text-xl font-mono font-black text-green-500">99.98%</span>
                   </div>
                   <div className="h-10 w-10 rounded-full border-2 border-slate-800 flex items-center justify-center">
                      <Radio className="h-4 w-4 text-slate-400" />
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'logistics' && (
            <div className="absolute inset-0 grid grid-cols-12 gap-6 animate-in slide-in-from-right duration-500">
              <div className="col-span-8 flex flex-col gap-6">
                 <div className="h-1/3 bg-slate-900/50 rounded-2xl border border-slate-800 p-8 flex items-center justify-center">
                    <div className="text-center">
                       <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Logistics Pipeline</h2>
                       <p className="text-slate-500 font-mono text-sm tracking-widest uppercase">Monitoring Flights & Hotels</p>
                    </div>
                 </div>
                 <div className="flex-1 grid grid-cols-2 gap-6">
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
                       <span className="text-xl font-black uppercase text-slate-400">Total Movements</span>
                       <span className="text-[120px] font-black leading-none tracking-tighter text-blue-500">84</span>
                    </div>
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
                       <span className="text-xl font-black uppercase text-slate-400">Room Allocation</span>
                       <span className="text-[120px] font-black leading-none tracking-tighter text-emerald-500">94%</span>
                    </div>
                 </div>
              </div>
              <div className="col-span-4 flex flex-col gap-6 overflow-hidden">
                 <div className="flex-1 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 overflow-hidden">
                    <h3 className="text-xs font-black uppercase text-blue-400 mb-4 tracking-widest">Arrival List</h3>
                    <div className="space-y-3">
                       {[1,2,3,4,5,6].map(i => (
                         <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px]">
                            <div className="flex flex-col">
                               <span className="text-slate-300 font-bold">EK-20{i} (DXB)</span>
                               <span className="text-slate-500 uppercase">Fighter Group #{i}</span>
                            </div>
                            <span className="text-blue-500 font-bold">14:2{i} ETA</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeView === 'safety' && (
            <div className="absolute inset-0 grid grid-cols-12 gap-6 animate-in slide-in-from-bottom duration-500">
               <div className="col-span-4 flex flex-col gap-6">
                  <div className="p-8 bg-red-950/20 border border-red-900/50 rounded-2xl">
                     <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                     <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Medical Alerts</h2>
                  </div>
                  <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-6">
                     <h3 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">Clearances</h3>
                     <div className="space-y-4">
                        {[1,2,3].map(i => (
                           <div key={i} className="flex gap-4 items-center">
                              <div className="h-10 w-10 rounded-lg bg-slate-900 border border-slate-800" />
                              <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                 <div className="h-full bg-yellow-500 w-[60%]" />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
               <div className="col-span-8 bg-slate-900/30 rounded-2xl border border-slate-800 p-8">
                   <div className="flex justify-between items-start mb-8">
                      <div>
                         <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Safety Grid</h2>
                      </div>
                   </div>
                   <div className="grid grid-cols-3 gap-6">
                      <div className="h-48 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-center items-center gap-4">
                         <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Blood Sync</span>
                         <span className="text-5xl font-black text-blue-500">22/22</span>
                      </div>
                      <div className="h-48 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-center items-center gap-4">
                         <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Medical Review</span>
                         <span className="text-5xl font-black text-red-500">18/22</span>
                      </div>
                      <div className="h-48 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-center items-center gap-4">
                         <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Doc Vault</span>
                         <span className="text-5xl font-black text-primary">20/22</span>
                      </div>
                   </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </WarRoomLayout>
  );
}

export default function WarRoomPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  
  return (
    <RealtimeProvider eventId={eventId}>
      <WarRoomContent eventId={eventId} />
    </RealtimeProvider>
  );
}
