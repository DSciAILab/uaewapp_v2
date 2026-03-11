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
import { Hotel, HotelFormData, HotelStatus } from '@/types/hotel';
import { createHotel, updateHotel, getEnrolledWithoutHotel } from '@/lib/services/hotel-service';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const hotelSchema = z.object({
  enrollment_id: z.string().min(1, 'Please select a person'),
  checkin_date: z.string().min(1, 'Check-in date is required'),
  checkout_date: z.string().min(1, 'Check-out date is required'),
  reservation_number: z.string().optional(),
  status: z.enum(['pending', 'reserved', 'confirmed', 'cancelled']),
  notes: z.string().optional(),
});

interface HotelFormProps {
  eventId: string;
  eventDates: { event_date: string; event_end_date: string };
  hotel?: Hotel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function HotelForm({ eventId, eventDates, hotel, open, onOpenChange, onSuccess }: HotelFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableEnrolled, setAvailableEnrolled] = useState<Array<{
    id: string;
    person: { id: string; compiled_name: string; role: string };
  }>>([]);

  // Treated as editing if hotel exists AND it's not a temporary/missing record
  const isEditing = !!hotel && !hotel.id.startsWith('missing-');
  const isPreFilled = !!hotel && hotel.id.startsWith('missing-');

  const form = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      enrollment_id: '',
      checkin_date: '',
      checkout_date: '',
      reservation_number: '',
      status: 'pending',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      getEnrolledWithoutHotel(eventId).then((data: any) => {
          setAvailableEnrolled(data);
      }).catch(console.error);
    }
  }, [open, eventId]);

  useEffect(() => {
    if (hotel) {
      form.reset({
        enrollment_id: hotel.enrollment_id,
        checkin_date: hotel.checkin_date ? hotel.checkin_date.split('T')[0] : '',
        checkout_date: hotel.checkout_date ? hotel.checkout_date.split('T')[0] : '',
        reservation_number: hotel.reservation_number || '',
        status: hotel.status as HotelStatus,
        notes: hotel.notes || '',
      });
    } else {
      form.reset({
        enrollment_id: '',
        checkin_date: '',
        checkout_date: '',
        reservation_number: '',
        status: 'pending',
        notes: '',
      });
    }
  }, [hotel?.id]);

  const onSubmit = async (data: HotelFormData) => {
    setIsLoading(true);
    try {
      if (isEditing && hotel) {
        await updateHotel(hotel.id, data, eventDates);
        toast.success('Hotel reservation updated');
      } else {
        await createHotel(eventId, data, eventDates);
        toast.success('Hotel reservation created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
            console.error(error);
      toast.error(isEditing ? 'Failed to update reservation' : 'Failed to create reservation');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: HotelStatus | 'reserved'; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Hotel Reservation' : 'New Hotel Reservation'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {(hotel || form.getValues('enrollment_id')) ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Guest</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {hotel?.enrolled?.person.compiled_name || availableEnrolled.find(e => e.id === form.getValues('enrollment_id'))?.person.compiled_name || 'Loading...'}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                     {(hotel?.enrolled as any)?.role?.name || (hotel?.enrolled as any)?.person?.role?.name || (availableEnrolled.find(e => e.id === form.getValues('enrollment_id')) as any)?.role?.name || (availableEnrolled.find(e => e.id === form.getValues('enrollment_id')) as any)?.person?.role || 'Guest'}
                  </Badge>
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="enrollment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Person *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableEnrolled.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.person.compiled_name} ({(e.person?.role as any)?.name || e.person?.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkin_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkout_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reservation_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Number</FormLabel>
                  <FormControl><Input placeholder="Booking confirmation" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
