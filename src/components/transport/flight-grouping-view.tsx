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

  const handleAssign = async (enrollmentId: string, carId: string) => {
    setLoadingId(`${enrollmentId}-${carId}`);
    try {
      await assignPassenger(carId, {
        enrollment_id: enrollmentId
      });
      toast.success('Passenger assigned to car');
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
          toast.success('Passenger removed from car');
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
          <Card
            key={group.flight.id}
            className={cn(
              "overflow-hidden border-l-4",
              isArrival ? "border-l-status-confirmed" : "border-l-status-pending"
            )}
          >
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", isArrival ? "bg-status-confirmed/10 text-status-confirmed" : "bg-status-pending/10 text-status-pending")}>
                        <Plane className={cn("h-5 w-5", !isArrival && "rotate-90")} />
                    </div>
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {group.flight.flight_number}
                            <Badge variant="outline" className="font-normal text-xs">
                                {isArrival ? 'Arriving' : 'Departing'}
                            </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 text-slate-500">
                            {date ? format(date, 'PPP p') : 'Time TBD'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Badge variant={group.unassigned_count > 0 ? "destructive" : "secondary"}>
                        {group.unassigned_count} Unassigned
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {group.passengers.length} passengers total
                    </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
               <div className="space-y-3">
                   {group.passengers.map((p) => {
                       const assignedCar = p.assigned_car;
                       // Find the specific passenger record ID from the assigned car's passengers
                       const passengerRecord = assignedCar?.passengers?.find(pass => pass.enrollment_id === p.enrolled_id);
                       
                       return (
                           <div key={`${p.enrolled_id}-${group.flight.type}`} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                               <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 rounded-full bg-surface-2 flex items-center justify-center font-bold text-xs text-muted-foreground">
                                       {p.person_name.charAt(0)}
                                   </div>
                                   <div>
                                       <p className="font-medium text-sm">{p.person_name}</p>
                                       <p className="text-xs text-muted-foreground">{p.role?.name || (typeof p.role === 'string' ? p.role : '')}</p>
                                   </div>
                               </div>

                               <div className="flex items-center gap-2">
                                   {assignedCar ? (
                                       <Badge variant="outline" className="h-8 px-3 gap-2 bg-slate-50 border-slate-200">
                                           <Car className="h-3 w-3 text-slate-500" />
                                           Car #{assignedCar.car_number}
                                           <button 
                                            onClick={() => passengerRecord && handleRemove(passengerRecord.id)}
                                            className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                                            title="Unassign"
                                           >
                                               <X className="h-3 w-3 text-muted-foreground" />
                                           </button>
                                       </Badge>
                                   ) : (
                                       <DropdownMenu>
                                           <DropdownMenuTrigger asChild>
                                               <Button size="sm" variant="outline" className="h-8 gap-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary">
                                                   <Plus className="h-3 w-3" />
                                                   Assign Car
                                               </Button>
                                           </DropdownMenuTrigger>
                                           <DropdownMenuContent align="end" className="w-[180px]">
                                               {cars.filter(c => c.type === group.flight.type).map(car => {
                                                   const currentCount = car.passengers?.length || 0;
                                                   return (
                                                       <DropdownMenuItem 
                                                        key={car.id} 
                                                        onClick={() => handleAssign(p.enrolled_id, car.id)}
                                                       >
                                                           <Car className="h-4 w-4 mr-2 text-slate-400" />
                                                           <span className="flex-1">Car #{car.car_number}</span>
                                                           <Badge variant="secondary" className="text-[10px] h-4 px-1">{currentCount} pax</Badge>
                                                       </DropdownMenuItem>
                                                   );
                                               })}
                                               {cars.filter(c => c.type === group.flight.type).length === 0 && (
                                                   <div className="p-3 text-xs text-center text-muted-foreground">
                                                       No {group.flight.type} cars available
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
