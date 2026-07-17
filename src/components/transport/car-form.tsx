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
  transport_type: z.enum(['arrival', 'departure', 'shuttle', 'custom']).optional().or(z.literal('')),
  pickup_location: z.string().optional(),
  dropoff_location: z.string().optional(),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
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
const NO_TRIP = 'none';

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
      transport_type: '',
      pickup_location: '',
      dropoff_location: '',
      scheduled_date: '',
      scheduled_time: '',
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
        transport_type: car.transport_type || '',
        pickup_location: car.pickup_location || '',
        dropoff_location: car.dropoff_location || '',
        scheduled_date: car.scheduled_date || '',
        scheduled_time: car.scheduled_time || '',
      });
    } else {
      form.reset({
        driver_id: '',
        car_label: '',
        capacity: 4,
        vehicle_type: 'van',
        license_plate: '',
        notes: '',
        transport_type: '',
        pickup_location: '',
        dropoff_location: '',
        scheduled_date: '',
        scheduled_time: '',
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

            <div className="rounded-md border border-dashed p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Optional trip: give this vehicle its own route and time (e.g. a shuttle).
                Passengers can be assigned later — or never.
              </p>

              <FormField
                control={form.control}
                name="transport_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Type</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === NO_TRIP ? '' : v)} value={field.value || NO_TRIP}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="No trip" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_TRIP}>-- No trip --</SelectItem>
                        <SelectItem value="shuttle">Shuttle</SelectItem>
                        <SelectItem value="arrival">Arrival</SelectItem>
                        <SelectItem value="departure">Departure</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickup_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Holiday Inn" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dropoff_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Etihad Arena" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduled_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduled_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
