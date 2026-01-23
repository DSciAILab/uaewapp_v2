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
import { createEventCar, updateEventCar, getDrivers } from '@/lib/services/transport-service';
import { toast } from 'sonner';

const carSchema = z.object({
  driver_id: z.string().optional(),
  car_label: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  vehicle_type: z.string().optional(),
  license_plate: z.string().optional(),
  notes: z.string().optional(),
});

interface CarFormProps {
  eventId: string;
  car?: EventCar | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const vehicleTypes = [
  { value: 'sedan', label: 'Sedan (4 passengers)', cap: 4 },
  { value: 'suv', label: 'SUV (6 passengers)', cap: 6 },
  { value: 'van', label: 'Van (12 passengers)', cap: 12 },
  { value: 'bus', label: 'Bus (20+ passengers)', cap: 24 },
];

export function CarForm({ eventId, car, open, onOpenChange, onSuccess }: CarFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const isEditing = !!car;

  const form = useForm<EventCarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      driver_id: '',
      car_label: '',
      capacity: 4,
      vehicle_type: 'sedan',
      license_plate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      getDrivers(true).then(setDrivers).catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (car) {
      form.reset({
        driver_id: car.driver_id || '',
        car_label: car.car_label || '',
        capacity: car.capacity,
        vehicle_type: car.vehicle_type || 'sedan',
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
  }, [car, form, open]);

  const vehicleType = form.watch('vehicle_type');
  useEffect(() => {
    if (vehicleType && !isEditing) {
      const type = vehicleTypes.find(t => t.value === vehicleType);
      if (type) {
        form.setValue('capacity', type.cap);
      }
    }
  }, [vehicleType, form, isEditing]);

  const onSubmit = async (data: EventCarFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateEventCar(car.id, data);
        toast.success('Car updated');
      } else {
        await createEventCar(eventId, data);
        toast.success('Car added to event');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update car' : 'Failed to add car');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Car' : 'Add Car to Event'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="car_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Label (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., VAN 1, SUV 2" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Driver</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Driver Assigned</SelectItem>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.full_name}{driver.vehicle_info && ` - ${driver.vehicle_info}`}
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
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="license_plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl><Input placeholder="ABC-1234" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
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
