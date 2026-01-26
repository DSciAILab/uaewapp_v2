'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Car, User } from 'lucide-react';
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
      toast.success('Car removed');
      onRefresh();
    } catch (error: any) {
      toast.error('Failed to remove car');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Car #</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Passengers</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cars.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No cars assigned to this event
              </TableCell>
            </TableRow>
          ) : (
            cars.map((car) => {
                const passengerCount = car.passengers?.length || 0;
                const isFull = passengerCount >= car.capacity;
                const utilizationColor = isFull ? 'bg-red-100 text-red-800' : passengerCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

                return (
                  <TableRow 
                    key={car.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onEdit(car)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted p-2 rounded-md">
                            <Car className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold">#{car.car_number}</span>
                            <span className="text-xs text-muted-foreground">{car.car_label}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {car.driver ? (
                          <div className="flex flex-col">
                              <span className="font-medium">{car.driver.full_name}</span>
                              <span className="text-xs text-muted-foreground">{car.driver.phone}</span>
                          </div>
                      ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="capitalize">{car.vehicle_type || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{car.license_plate}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                       {car.capacity}
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className={utilizationColor}>
                           {passengerCount} / {car.capacity}
                       </Badge>
                       {passengerCount > 0 && (
                           <div className="mt-1 flex -space-x-2 overflow-hidden">
                                {car.passengers?.slice(0, 3).map((p, i) => (
                                    <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-200 flex items-center justify-center text-[10px] font-bold" title={p.enrolled?.person.compiled_name}>
                                        {p.enrolled?.person.compiled_name.charAt(0)}
                                    </div>
                                ))}
                                {passengerCount > 3 && (
                                    <div className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-100 flex items-center justify-center text-[10px]">
                                        +{passengerCount - 3}
                                    </div>
                                )}
                           </div>
                       )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(car)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onManagePassengers(car)}>
                            <User className="mr-2 h-4 w-4" />Passengers
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
