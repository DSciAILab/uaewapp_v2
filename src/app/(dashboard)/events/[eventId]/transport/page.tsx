'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Car, Users, PlaneLanding, PlaneTakeoff, UserCheck, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CarTable } from '@/components/transport/car-table';
import { CarForm } from '@/components/transport/car-form';
import { DriverTable } from '@/components/transport/driver-table';
import { DriverForm } from '@/components/transport/driver-form';
import { PassengerAssignment } from '@/components/transport/passenger-assignment';
import { FlightGroupingView } from '@/components/transport/flight-grouping-view';
import { EventCar, Driver } from '@/types/transport';
import { getEventCars, getDrivers, getTransportStats, getFlightGroups } from '@/lib/services/transport-service';
import { FlightGroup } from '@/types/transport';
import { TransportStats } from '@/components/transport/transport-stats';

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
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
    } catch (error) {
      console.error('Failed to load transport data:', error);
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
    <div className="space-y-6 container py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 -ml-2">
              <Link href={`/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />Back to Event
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Transport Management</h1>
          <p className="text-muted-foreground mt-1">Manage cars, drivers, and passenger assignments for this event</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDriverFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Global Drivers
          </Button>
          <Button onClick={() => setIsCarFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />Add Car to Event
          </Button>
        </div>
      </div>

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
    </div>
  );
}
