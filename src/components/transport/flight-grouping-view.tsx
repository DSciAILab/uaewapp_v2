'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlaneLanding, PlaneTakeoff, Car, Users, AlertCircle, Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { FlightGroup, EventCar } from '@/types/transport';
import { getFlightGroups, getEventCars, addPassengerToCar } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface FlightGroupingViewProps {
  eventId: string;
}

export function FlightGroupingView({ eventId }: FlightGroupingViewProps) {
  const [groups, setGroups] = useState<{ arrivals: FlightGroup[]; departures: FlightGroup[] }>({ arrivals: [], departures: [] });
  const [cars, setCars] = useState<EventCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Assignment State
  const [assigningFlight, setAssigningFlight] = useState<{ id: string; type: 'arrival' | 'departure'; flight_number: string } | null>(null);
  const [selectedPassengers, setSelectedPassengers] = useState<string[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [groupsData, carsData] = await Promise.all([
        getFlightGroups(eventId),
        getEventCars(eventId)
      ]);
      setGroups(groupsData);
      setCars(carsData);
    } catch (error) {
      console.error('Failed to load transport grouping data:', error);
      toast.error('Failed to load flight groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleOpenAssign = (group: FlightGroup) => {
    const unassigned = group.passengers.filter(p => !p.assigned_car).map(p => p.enrolled_id);
    setAssigningFlight({ 
      id: group.flight.id, 
      type: group.flight.type,
      flight_number: group.flight.flight_number
    });
    setSelectedPassengers(unassigned);
    setSelectedCarId('');
  };

  const handleTogglePassenger = (id: string) => {
    setSelectedPassengers(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleBatchAssign = async () => {
    if (!selectedCarId || selectedPassengers.length === 0 || !assigningFlight) return;

    setIsSubmitting(true);
    try {
      const car = cars.find(c => c.id === selectedCarId);
      if (car && (car.passengers?.length || 0) + selectedPassengers.length > car.capacity) {
        if (!confirm(`Warning: This will exceed car capacity (${car.capacity}). Continue?`)) {
          setIsSubmitting(false);
          return;
        }
      }

      await Promise.all(
        selectedPassengers.map(enrolledId => 
          addPassengerToCar(selectedCarId, {
            enrolled_id: enrolledId,
            flight_id: assigningFlight.id,
            transport_type: assigningFlight.type
          })
        )
      );

      toast.success(`${selectedPassengers.length} passengers assigned to ${car?.car_label || car?.car_number}`);
      setAssigningFlight(null);
      loadData();
    } catch (error: any) {
      toast.error('Failed to assign passengers: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFlightGroup = (group: FlightGroup) => {
    const type = group.flight.type;
    return (
      <Card key={`${group.flight.id}-${type}`} className="mb-4 border-l-4 overflow-hidden" 
            style={{ borderLeftColor: type === 'arrival' ? '#2563eb' : '#ea580c' }}>
        <CardHeader className="pb-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${type === 'arrival' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                {type === 'arrival' ? <PlaneLanding className="h-4 w-4" /> : <PlaneTakeoff className="h-4 w-4" />}
              </div>
              <div>
                <CardTitle className="text-base font-bold">{group.flight.flight_number}</CardTitle>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {format(new Date(group.flight.datetime), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-bold">{group.passengers.length} Total</p>
                {group.unassigned_count > 0 ? (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-orange-600 border-orange-200 bg-orange-50">
                    {group.unassigned_count} PENDING
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-green-600 border-green-200 bg-green-50">
                    <Check className="h-2 w-2 mr-1" /> ALL LINKED
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.passengers.map((passenger) => (
              <div key={passenger.enrolled_id} className="flex items-center justify-between p-2 text-xs border rounded bg-card">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{passenger.person_name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase">{passenger.role}</span>
                  </div>
                </div>
                {passenger.assigned_car ? (
                  <Badge variant="secondary" className="text-[9px] h-4 font-mono">
                    <Car className="h-2 w-2 mr-1" />
                    {passenger.assigned_car.car_label || `#${passenger.assigned_car.car_number}`}
                  </Badge>
                ) : (
                  <span className="text-[9px] text-orange-500 font-bold italic animate-pulse">NO CAR</span>
                )}
              </div>
            ))}
          </div>

          {group.unassigned_count > 0 && (
            <Button size="sm" variant="default" className="w-full mt-4 h-8 text-xs flex items-center gap-2" onClick={() => handleOpenAssign(group)}>
              <Car className="h-3 w-3" /> Assign Pending Passengers
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
        <p>Grouping event participants by flight...</p>
      </div>
    );
  }

  const currentGroup = assigningFlight 
    ? [...groups.arrivals, ...groups.departures].find(g => g.flight.id === assigningFlight.id && g.flight.type === assigningFlight.type) 
    : null;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="arrivals">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-9">
            <TabsTrigger value="arrivals" className="flex items-center gap-2 px-6">
              <PlaneLanding className="h-4 w-4" /> Arrivals ({groups.arrivals.length})
            </TabsTrigger>
            <TabsTrigger value="departures" className="flex items-center gap-2 px-6">
              <PlaneTakeoff className="h-4 w-4" /> Departures ({groups.departures.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="arrivals" className="animate-in fade-in slide-in-from-left-2 duration-300">
          {groups.arrivals.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50">
              <PlaneLanding className="h-10 w-10 mx-auto mb-2" />
              <p>No arrival flights with passengers yet.</p>
            </div>
          ) : (
            groups.arrivals.map(renderFlightGroup)
          )}
        </TabsContent>

        <TabsContent value="departures" className="animate-in fade-in slide-in-from-right-2 duration-300">
          {groups.departures.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50">
              <PlaneTakeoff className="h-10 w-10 mx-auto mb-2" />
              <p>No departure flights with passengers yet.</p>
            </div>
          ) : (
            groups.departures.map(renderFlightGroup)
          )}
        </TabsContent>
      </Tabs>

      {/* Assignment Dialog */}
      <Dialog open={!!assigningFlight} onOpenChange={(open) => !open && setAssigningFlight(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Assign to Car - {assigningFlight?.flight_number}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Select Car</label>
              <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chose an event car" />
                </SelectTrigger>
                <SelectContent>
                  {cars.map(car => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.car_label || `CAR #${car.car_number}`} ({car.passengers?.length || 0}/{car.capacity} occupied)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Selected Passengers</label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {currentGroup?.passengers
                  .filter(p => !p.assigned_car)
                  .map(passenger => (
                    <div key={passenger.enrolled_id} className="flex items-center space-x-2 py-2 border-b last:border-0">
                      <Checkbox 
                        id={passenger.enrolled_id} 
                        checked={selectedPassengers.includes(passenger.enrolled_id)}
                        onCheckedChange={() => handleTogglePassenger(passenger.enrolled_id)}
                      />
                      <label htmlFor={passenger.enrolled_id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {passenger.person_name}
                      </label>
                    </div>
                  ))
                }
              </ScrollArea>
              <p className="text-[10px] text-muted-foreground">
                {selectedPassengers.length} passengers selected
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningFlight(null)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleBatchAssign} disabled={isSubmitting || !selectedCarId || selectedPassengers.length === 0}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Car className="h-4 w-4 mr-2" />}
              Assign to Car
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
