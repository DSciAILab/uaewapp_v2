'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventCar, FlightGroup } from '@/types/transport';
import { assignPassenger, removePassenger } from '@/lib/services/transport-service';
import { toast } from 'sonner';
import { ArrowRight, Car, Plane, Users, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FlightGroupingViewProps {
  groups: FlightGroup[];
  cars: EventCar[];
  onRefresh: () => void;
}

export function FlightGroupingView({ groups, cars, onRefresh }: FlightGroupingViewProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAssign = async (enrolledId: string, flightId: string, carId: string, type: 'arrival' | 'departure') => {
    setLoadingId(`${enrolledId}-${carId}`);
    try {
      await assignPassenger(carId, {
        enrolled_id: enrolledId,
        flight_id: flightId,
        transport_type: type
      });
      toast.success('Passenger assigned');
      onRefresh();
    } catch (error: any) {
      toast.error('Failed to assign passenger');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (passengerId: string) => {
      if (!confirm('Remove passenger from car?')) return;
      try {
          await removePassenger(passengerId);
          toast.success('Passenger removed');
          onRefresh();
      } catch (error) {
          toast.error('Failed to remove passenger');
      }
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const isArrival = group.flight.type === 'arrival';
        const date = group.flight.datetime ? new Date(group.flight.datetime) : null;
        
        return (
          <Card key={group.flight.id} className="overflow-hidden border-l-4" style={{ 
              borderLeftColor: isArrival ? '#10b981' : '#3b82f6' 
          }}>
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", isArrival ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>
                        <Plane className={cn("h-5 w-5", !isArrival && "rotate-90")} />
                    </div>
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {group.flight.flight_number}
                            <Badge variant="outline" className="font-normal text-xs">
                                {isArrival ? 'Arriving' : 'Departing'}
                            </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {date ? format(date, 'PPP p') : 'Time TBD'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Badge variant={group.unassigned_count > 0 ? "destructive" : "secondary"}>
                        {group.unassigned_count} Unassigned
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {group.passengers.length} passengers
                    </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
               <div className="space-y-3">
                   {group.passengers.map((p) => {
                       const assignedCar = p.assigned_car;
                       const passengerRef = assignedCar?.passengers?.find(pass => pass.enrolled_id === p.enrolled_id && pass.transport_type === group.flight.type);
                       
                       return (
                           <div key={`${p.enrolled_id}-${group.flight.type}`} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm">
                               <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                                       {p.person_name.charAt(0)}
                                   </div>
                                   <div>
                                       <p className="font-medium text-sm">{p.person_name}</p>
                                       <p className="text-xs text-muted-foreground">{p.role}</p>
                                   </div>
                               </div>

                               <div className="flex items-center gap-2">
                                   {assignedCar ? (
                                       <Badge variant="outline" className="h-8 px-3 gap-2 bg-slate-50">
                                           <Car className="h-3 w-3" />
                                           Car #{assignedCar.car_number}
                                           <button 
                                            onClick={() => passengerRef && handleRemove(passengerRef.id)}
                                            className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                                           >
                                               <X className="h-3 w-3 text-muted-foreground" />
                                           </button>
                                       </Badge>
                                   ) : (
                                       <DropdownMenu>
                                           <DropdownMenuTrigger asChild>
                                               <Button size="sm" variant="outline" className="h-8 gap-2 border-dashed text-muted-foreground">
                                                   <Plus className="h-3 w-3" />
                                                   Assign Car
                                               </Button>
                                           </DropdownMenuTrigger>
                                           <DropdownMenuContent align="end" className="w-[200px]">
                                               {cars.map(car => {
                                                   const currentCount = car.passengers?.length || 0;
                                                   const isFull = currentCount >= car.capacity;
                                                   return (
                                                       <DropdownMenuItem 
                                                        key={car.id} 
                                                        disabled={isFull}
                                                        onClick={() => handleAssign(p.enrolled_id, group.flight.id, car.id, group.flight.type as any)}
                                                       >
                                                           <Car className="h-4 w-4 mr-2" />
                                                           <span className="flex-1">Car #{car.car_number}</span>
                                                           <span className="text-xs text-muted-foreground">
                                                               {currentCount}/{car.capacity}
                                                           </span>
                                                       </DropdownMenuItem>
                                                   );
                                               })}
                                               {cars.length === 0 && (
                                                   <div className="p-2 text-xs text-center text-muted-foreground">
                                                       No cars available
                                                   </div>
                                               )}
                                           </DropdownMenuContent>
                                       </DropdownMenu>
                                   )}
                               </div>
                           </div>
                       );
                   })}
               </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
