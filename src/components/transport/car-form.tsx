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
  type: z.enum(['arrival', 'departure', 'event']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  vehicle_type: z.string().optional(),
  flight_number: z.string().optional(),
  flight_date: z.string().optional(),
  flight_time: z.string().optional(),
  airport: z.string().optional(),
  route_from: z.string().optional(),
  route_to: z.string().optional(),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
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
    resolver: zodResolver(carSchema) as any,
    defaultValues: {
      driver_id: '',
      type: 'arrival',
      status: 'scheduled',
      vehicle_type: '',
      flight_number: '',
      flight_date: '',
      flight_time: '',
      airport: '',
      route_from: '',
      route_to: '',
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
    },
  });

  const carType = form.watch('type');

  useEffect(() => {
    if (car) {
      form.reset({
        driver_id: car.driver_id || '',
        type: car.type,
        status: car.status,
        vehicle_type: car.vehicle_type || '',
        flight_number: car.flight_number || '',
        flight_date: car.flight_date || '',
        flight_time: car.flight_time || '',
        airport: car.airport || '',
        route_from: car.route_from || '',
        route_to: car.route_to || '',
        scheduled_date: car.scheduled_date || '',
        scheduled_time: car.scheduled_time || '',
        notes: car.notes || '',
      });
    } else {
      form.reset({
        driver_id: '',
        type: 'arrival',
        status: 'scheduled',
        vehicle_type: 'van',
        flight_number: '',
        flight_date: '',
        flight_time: '',
        airport: '',
        route_from: '',
        route_to: '',
        scheduled_date: '',
        scheduled_time: '',
        notes: '',
      });
    }
  }, [car, open, form]);

  const onSubmit = async (data: EventCarFormData) => {
    setIsLoading(true);
    try {
      if (isEditing && car) {
        await updateEventCar(car.id, data);
        toast.success('Transfer updated successfully');
      } else {
        await createEventCar(eventId, data);
        toast.success('Transfer added successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save transfer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Transfer' : 'Add New Transfer'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer Type *</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          // Clear unrelated fields when type changes if needed
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="arrival">Arrival (Airport → Hotel)</SelectItem>
                          <SelectItem value="departure">Departure (Hotel → Airport)</SelectItem>
                          <SelectItem value="event">Event (Hotel ↔ Venue / Other)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
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
                  <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">-- No Driver --</SelectItem>
                      {drivers.filter(d => d.is_active || d.id === car?.driver_id).map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(carType === 'arrival' || carType === 'departure') && (
                <div className="space-y-4 border p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Flight Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="flight_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flight Number</FormLabel>
                                    <FormControl><Input placeholder="EK123" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="airport"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Airport Code</FormLabel>
                                    <FormControl><Input placeholder="DXB" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="flight_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flight Date</FormLabel>
                                    <FormControl><Input type="date" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="flight_time"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Flight Time</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-4 border p-3 rounded-lg">
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Schedule & Route</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="route_from"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>From</FormLabel>
                                <FormControl><Input placeholder="e.g. Airport" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="route_to"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>To</FormLabel>
                                <FormControl><Input placeholder="e.g. Hotel" {...field} /></FormControl>
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
                                <FormLabel>Scheduled Date</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="scheduled_time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Scheduled Time</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
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
                {isLoading ? 'Saving...' : isEditing ? 'Update Transfer' : 'Add Transfer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
