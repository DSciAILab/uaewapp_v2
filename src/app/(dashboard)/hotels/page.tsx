'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Hotel, AlertTriangle, CheckCircle, Clock, Loader2, Info } from 'lucide-react';
import { HotelTable } from '@/components/hotels/hotel-table';
import { HotelFilters } from '@/components/hotels/hotel-filters';
import { Hotel as HotelType, HotelFilters as HotelFiltersType } from '@/types/hotel';
import { getEventHotels } from '@/lib/services/hotel-service';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HotelSpreadsheet } from '@/components/hotels/hotel-spreadsheet';
import { LayoutList, Table2, RefreshCw } from 'lucide-react';

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
    <div className="flex flex-colmin-h-screen bg-slate-50/50 dark:bg-slate-950">
        <Header 
            title="Global Hotel Logistics" 
            description="Manage hotel accommodations across all events."
        />

        <main className="flex-1 p-6 space-y-8 max-w-[1600px] mx-auto w-full">
            
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           {/* Header */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card 
            className={`border-l-4 border-l-blue-500 shadow-sm cursor-pointer transition-all hover:bg-accent ${Object.keys(filters).length === 0 ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilters({})}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center gap-2">
              <Hotel className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card 
            className={`border-l-4 border-l-green-500 shadow-sm cursor-pointer transition-all hover:bg-accent ${filters.status === 'confirmed' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilters({ status: 'confirmed' })}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Confirmed</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-lg font-bold">{stats.confirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card 
            className={`border-l-4 border-l-yellow-500 shadow-sm cursor-pointer transition-all hover:bg-accent ${filters.status === 'pending' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilters({ status: 'pending' })}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-lg font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card 
            className={`border-l-4 border-l-orange-500 shadow-sm cursor-pointer transition-all hover:bg-accent ${filters.has_divergence ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilters({ has_divergence: true })}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Divergences</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-lg font-bold">{stats.with_divergence}</span>
            </div>
          </CardContent>
        </Card>

        <Card 
            className={`border-l-4 border-l-red-500 shadow-sm cursor-pointer transition-all hover:bg-accent ${filters.has_divergence && filters.divergence_approved === false ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilters({ has_divergence: true, divergence_approved: false })}
        >
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Action Needed</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-lg font-bold">{stats.pending_approval}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between mb-[-8px]">
            <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Filter & Search</h4>
            <Button variant="ghost" size="sm" onClick={() => {
                loadData();
                router.refresh();
                toast.success('Refreshing data...');
            }} className="h-6 text-[10px] text-muted-foreground hover:text-foreground">
                <RefreshCw className="mr-1 h-3 w-3" />
                Force Refresh
            </Button>
        </div>
        <HotelFilters filters={filters} onChange={setFilters} />
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'list' | 'spreadsheet')} className="w-full">
         <div className="flex items-center justify-between mb-4">
            <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-2">
                    <LayoutList className="h-4 w-4" />
                    List View
                </TabsTrigger>
                <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
                    <Table2 className="h-4 w-4" />
                    Spreadsheet
                </TabsTrigger>
            </TabsList>
         </div>

        <TabsContent value="list" className="mt-0">
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
                                const eventId = hotel.event_id;
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
        </TabsContent>
        
        <TabsContent value="spreadsheet" className="mt-0">
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
        </TabsContent>
      </Tabs>
      
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
