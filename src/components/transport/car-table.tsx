'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Car, User, Info } from 'lucide-react';
import { EventCar } from '@/types/transport';
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
      toast.success('Transfer removed');
      onRefresh();
    } catch (error: any) {
      toast.error('Failed to remove transfer');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'arrival') return <span className="text-blue-500">↓ Arrival</span>;
    if (type === 'departure') return <span className="text-orange-500">↑ Departure</span>;
    return <span className="text-purple-500">↔ Event</span>;
  };

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[80px]">#</TableHead>
            <TableHead>Type & Info</TableHead>
            <TableHead>Route / Schedule</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Passengers</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cars.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <Car className="h-8 w-8 opacity-20" />
                    <p>No transfers scheduled for this event</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            cars.map((car) => {
                const passengerCount = car.passengers?.length || 0;

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
                        <span className="text-xs font-bold uppercase tracking-tighter opacity-70">
                            {getTypeIcon(car.type)}
                        </span>
                        {car.flight_number && (
                            <span className="font-medium text-sm flex items-center gap-1 mt-0.5">
                                <Info className="h-3 w-3" /> {car.flight_number} ({car.airport})
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{car.vehicle_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {(car.route_from || car.route_to) && (
                            <span className="font-medium">
                                {car.route_from || '?'} → {car.route_to || '?'}
                            </span>
                        )}
                        {(car.scheduled_date || car.scheduled_time) && (
                            <span className="text-xs text-muted-foreground">
                                {car.scheduled_date} {car.scheduled_time}
                            </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {car.driver ? (
                          <div className="flex flex-col">
                              <span className="font-medium text-sm">{car.driver.name}</span>
                              <span className="text-xs text-muted-foreground">{car.driver.phone}</span>
                          </div>
                      ) : (
                          <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                           <Badge variant="outline" className="w-fit">
                               {passengerCount} {passengerCount === 1 ? 'Passenger' : 'Passengers'}
                           </Badge>
                           {passengerCount > 0 && (
                               <div className="flex -space-x-1.5 overflow-hidden">
                                    {car.passengers?.slice(0, 4).map((p, i) => (
                                        <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-200 flex items-center justify-center text-[9px] font-bold" title={p.enrolled?.person.compiled_name}>
                                            {p.enrolled?.person.compiled_name.charAt(0)}
                                        </div>
                                    ))}
                                    {passengerCount > 4 && (
                                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-100 border flex items-center justify-center text-[9px]">
                                            +{passengerCount - 4}
                                        </div>
                                    )}
                               </div>
                           )}
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${getStatusColor(car.status)}`}>
                        {car.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(car)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit Transfer
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
