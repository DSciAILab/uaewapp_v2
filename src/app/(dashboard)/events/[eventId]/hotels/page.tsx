'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Hotel, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { HotelTable } from '@/components/hotels/hotel-table';
import { HotelForm } from '@/components/hotels/hotel-form';
import { HotelFilters } from '@/components/hotels/hotel-filters';
import { Hotel as HotelType, HotelFilters as HotelFiltersType } from '@/types/hotel';
import { getEventHotels, getHotelStats, getEnrolledWithoutHotel, importHotelsFromCSV, type HotelCSVRow } from '@/lib/services/hotel-service';
import { getEventById } from '@/lib/services/events';
import { CSVImportDropdown, downloadCSVTemplate } from '@/components/shared/csv-import-dropdown';
import { GenericCSVImport, type FieldDef } from '@/components/shared/generic-csv-import';

const HOTEL_FIELDS: FieldDef[] = [
  { value: 'passport_name', label: 'Nome Passaporte' },
  { value: 'checkin_date', label: 'Data Check-in' },
  { value: 'checkin_time', label: 'Hora Check-in' },
  { value: 'checkout_date', label: 'Data Checkout' },
  { value: 'checkout_time', label: 'Hora Checkout' },
  { value: 'reservation_number', label: 'Nº Reserva' },
  { value: 'status', label: 'Status' },
  { value: 'notes', label: 'Observações' },
];

export default function HotelsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [hotels, setHotels] = useState<HotelType[]>([]);
  const [editingHotel, setEditingHotel] = useState<HotelType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState<HotelFiltersType>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, with_divergence: 0, pending_approval: 0 });
  const [eventDates, setEventDates] = useState({ event_date: '', event_end_date: '' });
  const [csvOpen, setCsvOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hotelsData, statsData, event] = await Promise.all([
        getEventHotels(eventId, filters),
        getHotelStats(eventId),
        getEventById(eventId)
      ]);

      setHotels(hotelsData);
      setStats(statsData);
      
      if (event) {
        setEventDates({ 
          event_date: event.event_date, 
          event_end_date: event.event_end_date || event.event_date 
        });
      }
    } catch (error) {
      console.error('Failed to load hotels:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (hotel: HotelType) => {
    setEditingHotel(hotel);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingHotel(null);
  };

  return (
    <div className="space-y-6 container py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hotel Logistics</h1>
          <p className="text-muted-foreground mt-1">Manage and approve hotel accommodations for event participants</p>
        </div>
        <div className="flex gap-2">
          <CSVImportDropdown
            onImportClick={() => setCsvOpen(true)}
            onTemplateDownload={() => downloadCSVTemplate('hotel_import_template.csv', 'Passport Name,Checkin Date,Checkin Time,Checkout Date,Checkout Time,Reservation Number,Status,Notes\nJohn Doe,2026-04-15,14:00,2026-04-20,12:00,RES123,confirmed,VIP\n')}
          />
          <Button onClick={() => setIsFormOpen(true)} className="w-fit">
            <Plus className="h-4 w-4 mr-2" />New Reservation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Hotel className="h-4 w-4 text-blue-600" />
              <span className="text-xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xl font-bold">{stats.confirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">With Divergence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-xl font-bold">{stats.with_divergence}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Pending Appr.</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xl font-bold">{stats.pending_approval}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-muted/30 p-4 rounded-lg flex flex-col gap-4">
        <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-[-8px]">Filter & Search</h4>
        <HotelFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading hotel reservations...</p>
        </div>
      ) : (
        <HotelTable 
          hotels={hotels} 
          eventDates={eventDates}
          onEdit={handleEdit} 
          onRefresh={loadData} 
        />
      )}

      {/* Form Dialog */}
      <HotelForm
        eventId={eventId}
        eventDates={eventDates}
        hotel={editingHotel}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={loadData}
      />

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 border-none bg-transparent gap-0">
          <div className="bg-background rounded-lg border shadow-2xl flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
              <GenericCSVImport
                title="Importar Hotéis via CSV"
                subtitle="Evento selecionado"
                fields={HOTEL_FIELDS}
                requiredField="passport_name"
                onImport={(rows, upsert, progress) => importHotelsFromCSV(eventId, rows as any, upsert, progress)}
                onComplete={() => { setCsvOpen(false); loadData(); }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
