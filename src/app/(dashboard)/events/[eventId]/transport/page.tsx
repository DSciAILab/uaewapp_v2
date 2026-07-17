'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Car, Users, PlaneLanding, PlaneTakeoff, UserCheck, Loader2, ArrowLeft, AlertTriangle, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { CarTable } from '@/components/transport/car-table';
import { CarForm } from '@/components/transport/car-form';
import { DriverTable } from '@/components/transport/driver-table';
import { DriverForm } from '@/components/transport/driver-form';
import { PassengerAssignment } from '@/components/transport/passenger-assignment';
import { FlightGroupingView } from '@/components/transport/flight-grouping-view';
import { EventCar, Driver } from '@/types/transport';
import { getEventCars, getDrivers, getTransportStats, getFlightGroups, importDriversFromCSV } from '@/lib/services/transport-service';
import { FlightGroup } from '@/types/transport';
import { TransportStats } from '@/components/transport/transport-stats';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CSVImportDropdown, downloadCSVTemplate } from '@/components/shared/csv-import-dropdown';
import { GenericCSVImport, type FieldDef } from '@/components/shared/generic-csv-import';

const DRIVER_FIELDS: FieldDef[] = [
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'is_active', label: 'Active (true/false)' },
  { value: 'notes', label: 'Notes' },
];

export default function TransportPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [activeTab, setActiveTab] = useState('cars');
  const [cars, setCars] = useState<EventCar[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [flightGroups, setFlightGroups] = useState<FlightGroup[]>([]);
  const [editingCar, setEditingCar] = useState<EventCar | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isCarFormOpen, setIsCarFormOpen] = useState(false);
  const [isDriverFormOpen, setIsDriverFormOpen] = useState(false);
  const [passengerCar, setPassengerCar] = useState<EventCar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total_cars: 0,
    total_drivers: 0,
    active_drivers: 0,
    assigned_cars: 0,
    total_capacity: 0
  });
  const [csvOpen, setCsvOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [carsData, driversData, statsData, groupsData] = await Promise.all([
        getEventCars(eventId),
        getDrivers(),
        getTransportStats(eventId),
        getFlightGroups(eventId),
      ]);
      setCars(carsData);
      setDrivers(driversData);
      setStats(statsData);
      setFlightGroups(groupsData);
    } catch (err) {
      // A swallowed rejection left cars/drivers/stats at their empty/zero
      // initial values, making a hard failure look exactly like "no cars
      // assigned". Surface it instead of falling through to a zero-state.
      console.error('Failed to load transport data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditCar = (car: EventCar) => {
    setEditingCar(car);
    setIsCarFormOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setIsDriverFormOpen(true);
  };

  const handleCarFormClose = () => {
    setIsCarFormOpen(false);
    setEditingCar(null);
  };

  const handleDriverFormClose = () => {
    setIsDriverFormOpen(false);
    setEditingDriver(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <DashboardHeader
        title="Transport Management"
        description="Manage cars, drivers, and passenger assignments for this event"
        actions={
          <>
            <CSVImportDropdown
              label="CSV Motoristas"
              onImportClick={() => setCsvOpen(true)}
              onTemplateDownload={() => downloadCSVTemplate('drivers_import_template.csv', 'Name,Phone,Is Active,Notes\nMohamed Ali,+971501234567,true,Local driver\nAhmed Hassan,+971502345678,true,\n')}
            />
            <Button variant="outline" size="sm" onClick={() => setIsDriverFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Global Drivers
            </Button>
            <Button size="sm" onClick={() => setIsCarFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Car to Event
            </Button>
          </>
        }
      >
        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
          <Link href={`/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back to Event
          </Link>
        </Button>
      </DashboardHeader>

      <div className="flex-1 px-6 pb-6 space-y-6">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-status-critical/40 bg-status-critical/10 px-4 py-3"
        >
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-status-critical mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Transport data failed to load
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground break-words">
              {error}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vehicle and driver counts are unavailable — this is not an empty event.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-7 shrink-0"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : (
        <>
      {/* Stats Cards */}
      <TransportStats stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 pt-4 border-b bg-muted/30">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="cars" className="data-[state=active]:bg-background">Event Vehicles</TabsTrigger>
            <TabsTrigger value="flights" className="data-[state=active]:bg-background">By Flight Group</TabsTrigger>
            <TabsTrigger value="drivers" className="data-[state=active]:bg-background">Global Drivers Database</TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4">
          <TabsContent value="cars" className="mt-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">Loading event vehicles...</p>
              </div>
            ) : (
              <CarTable
                cars={cars}
                onEdit={handleEditCar}
                onManagePassengers={setPassengerCar}
                onRefresh={loadData}
              />
            )}
          </TabsContent>

          <TabsContent value="flights" className="mt-0">
             <FlightGroupingView 
                groups={flightGroups}
                cars={cars}
                onRefresh={loadData}
             />
          </TabsContent>

          <TabsContent value="drivers" className="mt-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">Loading driver database...</p>
              </div>
            ) : (
              <DriverTable
                drivers={drivers}
                onEdit={handleEditDriver}
                onRefresh={loadData}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>
        </>
      )}

      {/* Form Dialogs */}
      <CarForm
        eventId={eventId}
        car={editingCar}
        drivers={drivers}
        open={isCarFormOpen}
        onOpenChange={handleCarFormClose}
        onSuccess={loadData}
      />

      <DriverForm
        driver={editingDriver}
        open={isDriverFormOpen}
        onOpenChange={handleDriverFormClose}
        onSuccess={loadData}
      />

      {passengerCar && (
        <PassengerAssignment
          eventId={eventId}
          car={passengerCar}
          open={!!passengerCar}
          onOpenChange={(open) => !open && setPassengerCar(null)}
          onSuccess={loadData}
        />
      )}

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] p-0 border-none bg-transparent gap-0">
          <div className="bg-background rounded-lg border shadow-2xl flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
              <GenericCSVImport
                title="Import Drivers via CSV"
                subtitle="Global drivers"
                fields={DRIVER_FIELDS}
                requiredField="name"
                onImport={(rows, upsert, progress) => importDriversFromCSV(rows as any, upsert, progress)}
                onComplete={() => { setCsvOpen(false); loadData(); }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
