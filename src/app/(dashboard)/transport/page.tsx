'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Car, User, Plane } from 'lucide-react';
import { 
  getDrivers, 
  getEventCars, 
  getTransportStats, 
  getUnassignedPassengers
} from '@/lib/services/transport-service';
import { getFlightsByEvent } from '@/lib/services/flights';
import { getActiveEvents } from '@/lib/services/events';
import { DriverTable } from '@/components/transport/driver-table';
import { CarTable } from '@/components/transport/car-table';
import { FlightGroupingView } from '@/components/transport/flight-grouping-view';
import { DriverForm } from '@/components/transport/driver-form';
import { CarForm } from '@/components/transport/car-form';
import { TransportStats } from '@/components/transport/transport-stats';
import { toast } from 'sonner';
import { Driver, EventCar, FlightGroup } from '@/types/transport';
import { usePermissions } from '@/hooks/use-permissions';

function TransportContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('overview');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [cars, setCars] = useState<EventCar[]>([]);
    const [flightGroups, setFlightGroups] = useState<FlightGroup[]>([]);
    const [stats, setStats] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [eventId, setEventId] = useState<string | null>(searchParams.get('eventId'));

    // Dialog states
    const [driverFormOpen, setDriverFormOpen] = useState(false);
    const [carFormOpen, setCarFormOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [selectedCar, setSelectedCar] = useState<EventCar | null>(null);

    const { canEdit, loading: authLoading } = usePermissions();

    const loadData = async (targetEventId: string) => {
        setLoading(true);
        try {
            const [driversData, carsData, statsData] = await Promise.all([
                getDrivers(),
                getEventCars(targetEventId),
                getTransportStats(targetEventId)
            ]);
            
            const unassigned = await getUnassignedPassengers(targetEventId);
            const flights = await getFlightsByEvent(targetEventId);
            
            // Build a map of enrollment_id -> car for assigned passengers
            const enrollmentCarMap = new Map<string, EventCar>();
            carsData.forEach((c: EventCar) => {
                c.passengers?.forEach((p: any) => {
                    enrollmentCarMap.set(p.enrollment_id, c);
                });
            });

            const groups: FlightGroup[] = flights.map((f: any) => {
                const flightEnrollmentId = f.enrollment_id;
                
                const assignedCar = enrollmentCarMap.get(flightEnrollmentId);
                
                const assignedPassengers: any[] = [];
                if (assignedCar) {
                    assignedPassengers.push({
                        enrolled_id: flightEnrollmentId,
                        person_name: f.enrollment?.person?.compiled_name,
                        role: f.enrollment?.role?.name,
                        assigned_car: assignedCar
                    });
                }

                const groupUnassigned = unassigned.filter((u: any) => {
                    const uFlights = u.enrollment?.flights || [];
                    return uFlights.some((fl: any) => fl.id === f.id) || u.flight?.id === f.id;
                });

                const unassignedFormatted = groupUnassigned.map((u: any) => ({
                    enrolled_id: u.enrollment.id,
                    person_name: u.enrollment.person.compiled_name,
                    role: u.enrollment.role?.name || 'N/A',
                    assigned_car: undefined
                }));

                const assignedIds = new Set(assignedPassengers.map((p: any) => p.enrolled_id));
                const filteredUnassigned = unassignedFormatted.filter(
                    (u: any) => !assignedIds.has(u.enrolled_id)
                );

                const allPassengers = [...assignedPassengers, ...filteredUnassigned];

                return {
                    flight: {
                        id: f.id,
                        flight_number: f.type === 'arrival_only' || f.type === 'full' 
                            ? f.arrival_flight_number 
                            : f.departure_flight_number,
                        datetime: f.type === 'arrival_only' || f.type === 'full'
                            ? (f.arrival_date + 'T' + (f.arrival_time || '00:00:00'))
                            : (f.departure_date + 'T' + (f.departure_time || '00:00:00')),
                        type: f.type === 'departure_only' ? 'departure' as const : 'arrival' as const
                    },
                    passengers: allPassengers,
                    unassigned_count: filteredUnassigned.length
                } as FlightGroup;
            });

            setDrivers(driversData);
            setCars(carsData);
            setStats(statsData);
            setFlightGroups(groups);

        } catch (error) {
            console.error(error);
            toast.error('Failed to load transport data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (!authLoading) {
                let currentId = eventId;
                if (!currentId) {
                    const activeEvents = await getActiveEvents();
                    if (activeEvents.length > 0) {
                        currentId = activeEvents[0].id;
                        setEventId(currentId);
                    }
                }
                if (currentId) {
                    loadData(currentId);
                }
            }
        };
        init();
    }, [authLoading]);

    const handleEditDriver = (driver: Driver) => {
        setSelectedDriver(driver);
        setDriverFormOpen(true);
    };

    const handleCreateDriver = () => {
        setSelectedDriver(null);
        setDriverFormOpen(true);
    };

    const handleEditCar = (car: EventCar) => {
        setSelectedCar(car);
        setCarFormOpen(true);
    };

    const handleCreateCar = () => {
        setSelectedCar(null);
        setCarFormOpen(true);
    };

    return (
        <div className="flex flex-col h-full space-y-6 p-6">
            <Header title="Transport & Logistics" description="Manage drivers, vehicles, and passenger assignments." />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {stats && (
                    <TransportStats 
                        stats={stats} 
                        activeFilter={activeTab}
                        onFilterClick={(filter) => {
                            if (filter === 'cars' || filter === 'assigned') setActiveTab('cars');
                            else if (filter === 'drivers' || filter === 'active_drivers') setActiveTab('drivers');
                            else setActiveTab('overview');
                        }}
                    />
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="overview" className="flex items-center gap-2"><Plane className="h-4 w-4"/> Arrivals / Departures</TabsTrigger>
                        <TabsTrigger value="cars" className="flex items-center gap-2"><Car className="h-4 w-4"/> Event Cars</TabsTrigger>
                        <TabsTrigger value="drivers" className="flex items-center gap-2"><User className="h-4 w-4"/> Drivers Database</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => eventId && loadData(eventId)} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        {activeTab === 'drivers' && canEdit('transport') && (
                            <Button size="sm" onClick={handleCreateDriver}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Driver
                            </Button>
                        )}
                        {activeTab === 'cars' && canEdit('transport') && (
                            <Button size="sm" onClick={handleCreateCar}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Car
                            </Button>
                        )}
                    </div>
                </div>

                <TabsContent value="overview" className="mt-0 space-y-4">
                    <FlightGroupingView 
                        groups={flightGroups} 
                        cars={cars} 
                        onRefresh={() => eventId && loadData(eventId)} 
                    />
                </TabsContent>

                <TabsContent value="cars" className="mt-0">
                    <CarTable 
                        cars={cars} 
                        onEdit={handleEditCar} 
                        onRefresh={() => eventId && loadData(eventId)} 
                        onManagePassengers={(car) => {
                            console.log('Manage passengers for car', car.id);
                            handleEditCar(car);
                        }}
                    />
                </TabsContent>

                <TabsContent value="drivers" className="mt-0">
                    <DriverTable 
                        drivers={drivers} 
                        onEdit={handleEditDriver} 
                        onRefresh={() => eventId && loadData(eventId)} 
                    />
                </TabsContent>
            </Tabs>

            <DriverForm
                driver={selectedDriver}
                open={driverFormOpen}
                onOpenChange={setDriverFormOpen}
                onSuccess={() => eventId && loadData(eventId)}
            />

            <CarForm
                eventId={eventId || ''}
                car={selectedCar}
                drivers={drivers}
                open={carFormOpen}
                onOpenChange={setCarFormOpen}
                onSuccess={() => eventId && loadData(eventId)}
            />
        </div>
    );
}

export default function TransportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    }>
      <TransportContent />
    </Suspense>
  );
}
