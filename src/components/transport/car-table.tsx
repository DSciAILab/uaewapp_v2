'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal, Pencil, Trash2, Car, User,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import { EventCar, TransportType } from '@/types/transport';
import { deleteEventCar } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface CarTableProps {
  cars: EventCar[];
  onEdit: (car: EventCar) => void;
  onManagePassengers: (car: EventCar) => void;
  onRefresh: () => void;
}

export function CarTable({ cars, onEdit, onManagePassengers, onRefresh }: CarTableProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will unassign all passengers.')) return;

    setIsDeleting(true);
    try {
      await deleteEventCar(id);
      toast.success('Vehicle removed');
      onRefresh();
    } catch (error: any) {
      toast.error('Failed to remove vehicle');
    } finally {
      setIsDeleting(false);
    }
  };

  // Direction is derived from the car's passengers (cars have no `type` column),
  // and a car may legitimately serve both legs — so this renders zero, one, or
  // two neutral directional markers rather than a single status-coloured hue.
  const renderDirections = (types: TransportType[] | undefined) => {
    if (!types || types.length === 0) {
      return <span className="text-xs text-muted-foreground italic">No passengers</span>;
    }

    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        {types.map((t) => {
          const Icon = t === 'arrival' ? ArrowDownToLine : ArrowUpFromLine;
          return (
            <span key={t} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t === 'arrival' ? 'Arrival' : 'Departure'}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[80px]">#</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Legs</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Passengers</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cars.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <Car className="h-8 w-8 opacity-20" />
                    <p>No vehicles registered for this event</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            cars.map((car) => {
                const passengerCount = car.passengers?.length || 0;
                const capacity = car.capacity ?? 0;
                const overCapacity = capacity > 0 && passengerCount > capacity;

                return (
                  <TableRow
                    key={car.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => onEdit(car)}
                  >
                    <TableCell className="font-bold text-lg">
                      #{car.car_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {car.car_label && (
                          <span className="font-medium text-sm">{car.car_label}</span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">
                          {car.vehicle_type || 'Unspecified'}
                        </span>
                        {car.license_plate && (
                          <span className="text-xs text-muted-foreground">{car.license_plate}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        {car.transport_type && (
                          <div className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wide">{car.transport_type}</span>
                            {(car.pickup_location || car.dropoff_location) && (
                              <span className="text-xs text-muted-foreground">
                                {car.pickup_location || '?'} → {car.dropoff_location || '?'}
                              </span>
                            )}
                            {(car.scheduled_date || car.scheduled_time) && (
                              <span className="text-xs text-muted-foreground">
                                {[car.scheduled_date, car.scheduled_time].filter(Boolean).join(' ')}
                              </span>
                            )}
                          </div>
                        )}
                        {!car.transport_type && renderDirections(car.transport_types)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {car.driver ? (
                          <div className="flex flex-col">
                              <span className="font-medium text-sm">{car.driver.full_name}</span>
                              <span className="text-xs text-muted-foreground">{car.driver.phone}</span>
                          </div>
                      ) : (
                          <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                           <Badge variant={overCapacity ? 'destructive' : 'outline'} className="w-fit">
                               {passengerCount} / {capacity}
                           </Badge>
                           {passengerCount > 0 && (
                               <div className="flex -space-x-1.5 overflow-hidden">
                                    {car.passengers?.slice(0, 4).map((p, i) => (
                                        <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-200 flex items-center justify-center text-[9px] font-bold" title={p.enrolled?.person.compiled_name}>
                                            {p.enrolled?.person.compiled_name.charAt(0)}
                                        </div>
                                    ))}
                                    {passengerCount > 4 && (
                                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-surface-2 text-muted-foreground border flex items-center justify-center text-[9px]">
                                            +{passengerCount - 4}
                                        </div>
                                    )}
                               </div>
                           )}
                       </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(car)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit Vehicle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onManagePassengers(car)}>
                            <User className="mr-2 h-4 w-4" />Manage Passengers
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(car.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
