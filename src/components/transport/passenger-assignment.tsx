'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, UserMinus, Users, Plane, PlaneLanding, PlaneTakeoff, Loader2 } from 'lucide-react';
import { EventCar, CarPassenger } from '@/types/transport';
import { assignPassenger, removePassenger, getUnassignedPassengers } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface PassengerAssignmentProps {
  eventId: string;
  car: EventCar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PassengerAssignment({ eventId, car, open, onOpenChange, onSuccess }: PassengerAssignmentProps) {
  const [activeTab, setActiveTab] = useState<'arrival' | 'departure'>('arrival');
  const [isLoading, setIsLoading] = useState(false);
  const [isUnassignedLoading, setIsUnassignedLoading] = useState(false);
  const [unassigned, setUnassigned] = useState<Array<{ enrolled_id: string; person_name: string; role: string; flight_id?: string }>>([]);

  const loadUnassigned = async () => {
    setIsUnassignedLoading(true);
    try {
      const data = await getUnassignedPassengers(eventId);
      setUnassigned(data);
    } catch (error) {
      console.error('Failed to load unassigned passengers:', error);
    } finally {
      setIsUnassignedLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadUnassigned();
    }
  }, [open, activeTab]);

  const handleAddPassenger = async (enrolledId: string, flightId?: string) => {
    setIsLoading(true);
    try {
      await assignPassenger(car.id, { 
        enrolled_id: enrolledId, 
        transport_type: activeTab,
        flight_id: flightId
      });
      toast.success('Passenger added');
      onSuccess();
      loadUnassigned();
    } catch (error: any) {
      toast.error('Failed to add passenger: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassenger = async (passengerId: string) => {
    setIsLoading(true);
    try {
      await removePassenger(passengerId);
      toast.success('Passenger removed');
      onSuccess();
      loadUnassigned();
    } catch (error) {
      toast.error('Failed to remove passenger');
    } finally {
      setIsLoading(false);
    }
  };

  const arrivalPassengers = car.passengers?.filter(p => p.transport_type === 'arrival') || [];
  const departurePassengers = car.passengers?.filter(p => p.transport_type === 'departure') || [];

  const renderPassengerList = (passengers: CarPassenger[]) => (
    <div className="space-y-2 py-2">
      {passengers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border border-dashed rounded-lg">
          <UserPlus className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-sm">No passengers assigned</p>
        </div>
      ) : (
        passengers.map((passenger) => (
          <div key={passenger.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card transition-colors">
            <div>
              <p className="font-medium text-sm">{passenger.enrolled?.person?.compiled_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase">{passenger.enrolled?.person?.role}</Badge>
                {passenger.flight && (
                  <span className="flex items-center gap-1 font-mono">
                    <Plane className="h-3 w-3" />{passenger.flight.flight_number}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleRemovePassenger(passenger.id)} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
            </Button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Manage Passengers - {car.car_label || `CAR #${car.car_number}`}
          </DialogTitle>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
            <span>Capacity: <span className="font-bold text-foreground">{car.capacity} seats</span></span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><PlaneLanding className="h-3 w-3" /> {arrivalPassengers.length} arrivals</span>
              <span className="flex items-center gap-1"><PlaneTakeoff className="h-3 w-3" /> {departurePassengers.length} departures</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'arrival' | 'departure')} className="flex-1 flex flex-col mt-4">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="arrival" className="flex items-center gap-2">
                <PlaneLanding className="h-4 w-4" />Arrivals ({arrivalPassengers.length})
              </TabsTrigger>
              <TabsTrigger value="departure" className="flex items-center gap-2">
                <PlaneTakeoff className="h-4 w-4" />Departures ({departurePassengers.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 mt-2">
            <div className="py-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                Currently Assigned
                <span className="h-[1px] flex-1 bg-muted"></span>
              </h4>
              
              <TabsContent value="arrival" className="mt-0">
                {renderPassengerList(arrivalPassengers)}
              </TabsContent>

              <TabsContent value="departure" className="mt-0">
                {renderPassengerList(departurePassengers)}
              </TabsContent>
            </div>

            <div className="py-4 border-t mt-4">
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                Available to Assign ({activeTab})
                <span className="h-[1px] flex-1 bg-muted"></span>
              </h4>
              
              {isUnassignedLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No unassigned passengers for this category.</p>
              ) : (
                <div className="space-y-2">
                  {unassigned.map((p) => (
                    <div key={p.enrolled_id} className="flex items-center justify-between p-2 border rounded text-xs bg-muted/30">
                      <span>{p.person_name} <span className="text-[10px] opacity-50">({p.role})</span></span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleAddPassenger(p.enrolled_id, p.flight_id)}
                        disabled={isLoading}
                      >
                        <UserPlus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-center text-muted-foreground italic mt-6">
                Manage individuals by flight arrival/departure groups in the "By Flight" tab for better logistics.
              </p>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="p-6 border-t flex justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close Manager</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
