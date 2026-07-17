'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, UserMinus, Users, PlaneLanding, PlaneTakeoff, Loader2, Car } from 'lucide-react';
import { EventCar, TransportType, UnassignedPassenger } from '@/types/transport';
import { assignPassenger, removePassenger, getUnassignedPassengers } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface PassengerAssignmentProps {
  eventId: string;
  car: EventCar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DirectionBadge({ type }: { type: TransportType }) {
  const Icon = type === 'arrival' ? PlaneLanding : PlaneTakeoff;
  return (
    <Badge variant="outline" className="capitalize text-[9px] h-4 px-1">
      <Icon className="h-3 w-3 mr-1" />
      {type}
    </Badge>
  );
}

export function PassengerAssignment({ eventId, car, open, onOpenChange, onSuccess }: PassengerAssignmentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUnassignedLoading, setIsUnassignedLoading] = useState(false);
  const [unassigned, setUnassigned] = useState<UnassignedPassenger[]>([]);

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
  }, [open]);

  // transport_type is NOT NULL on mma_car_passengers, so the direction must come
  // from the pending leg being filled — it can no longer be read off the car.
  const handleAddPassenger = async (enrolledId: string, transportType: TransportType) => {
    setIsLoading(true);
    try {
      await assignPassenger(car.id, { enrolled_id: enrolledId, transport_type: transportType });
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

  const passengers = car.passengers || [];
  const capacity = car.capacity ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Manage Passengers - CAR #{car.car_number}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize">
              <Car className="h-3 w-3 mr-1" />
              {car.vehicle_type || 'Vehicle'}
            </Badge>
            {car.car_label && (
              <span className="text-xs text-muted-foreground italic">{car.car_label}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {passengers.length} / {capacity} seats
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
              Currently Assigned ({passengers.length})
              <span className="h-[1px] flex-1 bg-muted"></span>
            </h4>

            <div className="space-y-2">
              {passengers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-lg bg-slate-50/50">
                  <UserPlus className="h-6 w-6 mb-2 opacity-20" />
                  <p className="text-xs text-muted-foreground">No passengers assigned yet</p>
                </div>
              ) : (
                passengers.map((passenger) => (
                  <div key={passenger.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card transition-colors">
                    <div>
                      <p className="font-medium text-sm">{passenger.enrolled?.person?.compiled_name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase">
                          {passenger.enrolled?.person?.role?.name}
                        </Badge>
                        <DirectionBadge type={passenger.transport_type} />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive shrink-0" onClick={() => handleRemovePassenger(passenger.id)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="py-4 border-t mt-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
              Available to Assign
              <span className="h-[1px] flex-1 bg-muted"></span>
            </h4>

            {isUnassignedLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : unassigned.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                  <p className="text-xs text-muted-foreground">All event attendees are already assigned transfers.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {unassigned.map((p) => (
                  <div
                    key={`${p.enrolled_id}_${p.transport_type}`}
                    className="flex items-center justify-between p-2 pl-3 border rounded-md text-sm bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <span className="font-medium truncate mr-2 flex items-center gap-2">
                        <span className="truncate">
                          {p.person_name}
                          <span className="ml-2 text-[10px] font-normal opacity-60">({p.role?.name})</span>
                        </span>
                        <DirectionBadge type={p.transport_type} />
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
                      onClick={() => handleAddPassenger(p.enrolled_id, p.transport_type)}
                      disabled={isLoading}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex justify-end bg-slate-50 dark:bg-slate-900/20">
          <Button onClick={() => onOpenChange(false)} className="px-8">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
