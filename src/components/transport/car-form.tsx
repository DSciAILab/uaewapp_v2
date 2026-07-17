'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EventCar, EventCarFormData, Driver } from '@/types/transport';
import { createEventCar, updateEventCar } from '@/lib/services/transport-service';
import { toast } from 'sonner';

// Only fields that exist on mma_event_cars. Flight/route/schedule/status live on
// the passenger (or nowhere) in the current schema — see EventCar docs — so this
// form describes a VEHICLE, and direction is chosen when assigning passengers.
const carSchema = z.object({
  driver_id: z.string().optional().or(z.literal('')),
  car_label: z.string().optional(),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  vehicle_type: z.string().optional(),
  license_plate: z.string().optional(),
  notes: z.string().optional(),
});

interface CarFormProps {
  eventId: string;
  car?: EventCar | null;
  drivers: Driver[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const UNASSIGNED = 'unassigned';

export function CarForm({ eventId, car, drivers, open, onOpenChange, onSuccess }: CarFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!car;

  const form = useForm<EventCarFormData>({
    resolver: zodResolver(carSchema) as any,
    defaultValues: {
      driver_id: '',
      car_label: '',
      capacity: 4,
      vehicle_type: '',
      license_plate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (car) {
      form.reset({
        driver_id: car.driver_id || '',
        car_label: car.car_label || '',
        capacity: car.capacity ?? 4,
        vehicle_type: car.vehicle_type || '',
        license_plate: car.license_plate || '',
        notes: car.notes || '',
      });
    } else {
      form.reset({
        driver_id: '',
        car_label: '',
        capacity: 4,
        vehicle_type: 'van',
        license_plate: '',
        notes: '',
      });
    }
  }, [car, open, form]);

  const onSubmit = async (data: EventCarFormData) => {
    setIsLoading(true);
    try {
      const payload: EventCarFormData = {
        ...data,
        driver_id: data.driver_id === UNASSIGNED ? '' : data.driver_id,
      };
      if (isEditing && car) {
        await updateEventCar(car.id, payload);
        toast.success('Vehicle updated successfully');
      } else {
        await createEventCar(eventId, payload);
        toast.success('Vehicle added successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
          <DialogDescription>
            A vehicle is not tied to a single trip. Assign passengers to set arrival
            or departure legs.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="car_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Team Bus A" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} value={field.value ?? 4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="driver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || UNASSIGNED}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>-- No Driver --</SelectItem>
                      {drivers.filter(d => d.is_active || d.id === car?.driver_id).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="bus">Bus</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license_plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Plate</FormLabel>
                    <FormControl>
                      <Input placeholder="A 12345" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Specific instructions..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Add Vehicle'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
