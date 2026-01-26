'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EventCar, EventCarFormData, Driver } from '@/types/transport';
import { createEventCar, updateEventCar } from '@/lib/services/transport-service';
import { toast } from 'sonner';

const carSchema = z.object({
  driver_id: z.string().optional().or(z.literal('')),
  car_label: z.string().optional(),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
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

export function CarForm({ eventId, car, drivers, open, onOpenChange, onSuccess }: CarFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!car;

  const form = useForm<EventCarFormData>({
    resolver: zodResolver(carSchema),
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
        capacity: car.capacity,
        vehicle_type: car.vehicle_type || '',
        license_plate: car.license_plate || '',
        notes: car.notes || '',
      });
    } else {
      form.reset({
        driver_id: '',
        car_label: '',
        capacity: 4,
        vehicle_type: 'sedan',
        license_plate: '',
        notes: '',
      });
    }
  }, [car, open, form]);

  const onSubmit = async (data: EventCarFormData) => {
    setIsLoading(true);
    try {
      if (isEditing && car) {
        await updateEventCar(car.id, data);
        toast.success('Car updated successfully');
      } else {
        await createEventCar(eventId, data);
        toast.success('Car added successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save car');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDriverChange = (driverId: string) => {
      form.setValue('driver_id', driverId);
      // Auto-fill vehicle info if available and empty in form
      const driver = drivers.find(d => d.id === driverId);
      if (driver && driver.vehicle_info && !form.getValues('vehicle_type')) {
          // Simple heuristic: check if info contains keywords
          const info = driver.vehicle_info.toLowerCase();
          if (info.includes('van')) form.setValue('vehicle_type', 'van');
          else if (info.includes('suv')) form.setValue('vehicle_type', 'suv');
          else if (info.includes('bus')) form.setValue('vehicle_type', 'bus');
          else form.setValue('vehicle_type', 'sedan');
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event Car' : 'Add Car to Event'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="driver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver (Optional)</FormLabel>
                  <Select onValueChange={handleDriverChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">-- No Driver --</SelectItem>
                      {drivers.filter(d => d.is_active).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.full_name} {d.vehicle_info ? `(${d.vehicle_info})` : ''}
                        </SelectItem>
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
                  name="car_label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl><Input placeholder="e.g. VAN 1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicle_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sedan">Sedan (4)</SelectItem>
                          <SelectItem value="suv">SUV (6)</SelectItem>
                          <SelectItem value="van">Van (10+)</SelectItem>
                          <SelectItem value="bus">Bus (30+)</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                      <FormControl><Input placeholder="ABC-123" {...field} /></FormControl>
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
                  <FormControl><Textarea placeholder="Specific instructions..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Car'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
