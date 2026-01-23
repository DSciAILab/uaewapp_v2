'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { EventCar } from '@/types/transport';
import { deleteEventCar } from '@/lib/services/transport-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface CarTableProps {
  cars: EventCar[];
  onEdit: (car: EventCar) => void;
  onManagePassengers: (car: EventCar) => void;
  onRefresh: () => void;
}

export function CarTable({ cars, onEdit, onManagePassengers, onRefresh }: CarTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteEventCar(deleteId);
      toast.success('Car removed from event');
      onRefresh();
    } catch (error) {
      toast.error('Failed to remove car');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Car #</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead className="w-[180px]">Occupation</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No cars assigned to this event
                </TableCell>
              </TableRow>
            ) : (
              cars.map((car) => {
                const passengerCount = car.passengers?.length || 0;
                const fillPercentage = (passengerCount / car.capacity) * 100;

                return (
                  <TableRow key={car.id}>
                    <TableCell className="font-mono font-bold text-center">#{car.car_number}</TableCell>
                    <TableCell>{car.car_label || `CAR ${car.car_number}`}</TableCell>
                    <TableCell>
                      {car.driver ? (
                        <div>
                          <p className="font-medium text-sm">{car.driver.full_name}</p>
                          {car.driver.phone && <p className="text-xs text-muted-foreground">{car.driver.phone}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="capitalize text-[10px] w-fit h-4 px-1">{car.vehicle_type || 'Unknown'}</Badge>
                        {car.license_plate && <p className="text-[10px] text-muted-foreground font-mono">{car.license_plate}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{car.capacity}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                          <span>{passengerCount} / {car.capacity} used</span>
                          {passengerCount > car.capacity && (
                            <span className="text-red-600">OVER LIMIT</span>
                          )}
                        </div>
                        <Progress 
                          value={Math.min(fillPercentage, 100)} 
                          className={`h-1.5 ${fillPercentage > 100 ? 'bg-red-200 [&>div]:bg-red-600' : ''}`} 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onManagePassengers(car)}>
                            <Users className="mr-2 h-4 w-4" />Manage Passengers
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(car)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit Car Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(car.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete Car
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Car?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the car and all passenger assignments for this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
