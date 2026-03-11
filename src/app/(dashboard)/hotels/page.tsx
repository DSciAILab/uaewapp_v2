'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Hotel, AlertTriangle, CheckCircle, Clock, Loader2, Info } from 'lucide-react';
import { HotelTable } from '@/components/hotels/hotel-table';
import { HotelStats } from '@/components/hotels/hotel-stats';
import { HotelFilters } from '@/components/hotels/hotel-filters';
import { Hotel as HotelType, HotelFilters as HotelFiltersType } from '@/types/hotel';
import { getEventHotels } from '@/lib/services/hotel-service';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { toast } from 'sonner';


import { HotelSpreadsheet } from '@/components/hotels/hotel-spreadsheet';

export default function GlobalHotelsPage() {
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelType[]>([]);
  const [filters, setFilters] = useState<HotelFiltersType>({});
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'spreadsheet'>('list');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, with_divergence: 0, pending_approval: 0 });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch hotels for ALL events (no eventId passed)
      const hotelsData = await getEventHotels(undefined, filters);
      setHotels(hotelsData);
      
      // Calculate stats locally since we don't have a global stats endpoint yet
      const newStats = {
        total: hotelsData.length,
        confirmed: hotelsData.filter(h => h.status === 'confirmed').length,
        pending: hotelsData.filter(h => h.status === 'pending').length,
        with_divergence: hotelsData.filter(h => h.has_divergence).length,
        pending_approval: hotelsData.filter(h => h.has_divergence && !h.divergence_approved).length
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to load global hotels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950">
        <Header 
            title="Global Hotel Logistics" 
            description="Manage hotel accommodations across all events."
        />

        <main className="flex-1 p-6 space-y-8 w-full">
            
      {/* Stats Cards */}
      <HotelStats 
        stats={stats}
        activeStatus={
            filters.has_divergence && filters.divergence_approved === false ? 'action_needed' :
            filters.has_divergence ? 'divergence' :
            filters.status || 'all'
        }
        onStatusClick={(status) => {
            if (status === 'all') {
                setFilters({});
            } else if (status === 'divergence') {
                setFilters({ has_divergence: true });
            } else if (status === 'action_needed') {
                setFilters({ has_divergence: true, divergence_approved: false });
            } else {
                setFilters({ status: status as any });
            }
        }}
      />

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 shadow-sm">
        <HotelFilters 
            filters={filters} 
            onChange={setFilters} 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onRefresh={() => {
                loadData();
                router.refresh();
                toast.success('Refreshing data...');
            }}
        />
      </div>

      {viewMode === 'list' ? (
         <>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading global hotel reservations...</p>
                </div>
            ) : (
                <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                    {hotels.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <p>No hotel reservations found across any event.</p>
                            <p className="text-sm mt-2">Go to a specific event to add reservations.</p>
                        </div>
                    ) : (
                        <HotelTable 
                            hotels={hotels} 
                            onEdit={(hotel) => {
                                const eventId = hotel.enrolled?.event_id;
                                if (eventId) {
                                    router.push(`/events/${eventId}/hotels`)
                                } else {
                                    alert('Event ID missing for this reservation')
                                }
                            }} 
                            onRefresh={loadData} 
                        />
                    )}
                </div>
            )}
        </>
      ) : (
        <>
             {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-lg border">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Loading spreadsheet...</p>
                </div>
             ) : (
                <HotelSpreadsheet
                    hotels={hotels}
                    onRefresh={loadData}
                />
             )}
        </>
      )}
      
      <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg text-sm">
        <Info className="h-5 w-5 shrink-0" />
        <p>
            This is a global view of all hotel reservations. To create new reservations or manage room types in detail, 
            please navigate to the specific <strong>Event &gt; Hotel Logistics</strong> page.
        </p>
      </div>

      </main>
    </div>
  );
}
