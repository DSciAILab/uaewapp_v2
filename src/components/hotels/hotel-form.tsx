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
  hotel_name: z.string().optional(), // Now optional in UI, handled by service
  room_type: z.string().optional(),
  actual_checkin: z.string().min(1, 'Check-in date is required'),
  actual_checkout: z.string().min(1, 'Check-out date is required'),
  confirmation_number: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  notes: z.string().optional(),
  divergence_reason: z.string().optional(),
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
      hotel_name: '',
      room_type: '',
      actual_checkin: '',
      actual_checkout: '',
      confirmation_number: '',
      status: 'pending',
      notes: '',
      divergence_reason: '',
    },
  });

  useEffect(() => {
    // Determine available people
    // If Creating (fresh) -> Fetch all without hotel
    // If PreFilled -> We have the person in the 'hotel' object already, we should use it or fetch all to include it.
    // Ideally, for PreFilled, we assume the person IS available (logic in page ensures they don't have hotel).
    
    if (open) {
      getEnrolledWithoutHotel(eventId).then((data: any) => {
          // If pre-filled, ensure the pre-filled person is in the list (it should be, since they don't have hotel)
          setAvailableEnrolled(data);
      }).catch(console.error);
    }
  }, [open, eventId]);

  useEffect(() => {
    // Only reset if the hotel ID changes (meaning a different record was selected)
    if (hotel) {
      form.reset({
        enrollment_id: hotel.enrollment_id,
        hotel_name: isPreFilled ? '' : hotel.hotel_name,
        room_type: hotel.room_type || '',
        actual_checkin: hotel.actual_checkin ? hotel.actual_checkin.split('T')[0] : '',
        actual_checkout: hotel.actual_checkout ? hotel.actual_checkout.split('T')[0] : '',
        confirmation_number: hotel.confirmation_number || '',
        status: hotel.status as HotelStatus,
        notes: hotel.notes || '',
        divergence_reason: hotel.divergence_reason || '',
      });
    } else {
      form.reset({
        enrollment_id: '',
        hotel_name: '',
        room_type: '',
        actual_checkin: '',
        actual_checkout: '',
        confirmation_number: '',
        status: 'pending',
        notes: '',
        divergence_reason: '',
      });
    }
  }, [hotel?.id]); // Only trigger when ID changes (removing form dependency to avoid loops)


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

  const statusOptions: { value: HotelStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
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
            {/* Guest Name Display (Read-only if we already know who it is) */}
            {(hotel || form.getValues('enrollment_id')) ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Guest</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {hotel?.enrolled?.person.full_name || availableEnrolled.find(e => e.id === form.getValues('enrollment_id'))?.person.compiled_name || 'Loading...'}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                     {hotel?.enrolled?.person.role || availableEnrolled.find(e => e.id === form.getValues('enrollment_id'))?.person.role || 'Guest'}
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
                            {e.person.compiled_name} ({e.person.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Hidden Hotel Name (Automatically handled by service) */}
            <FormField
              control={form.control}
              name="hotel_name"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="room_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <FormControl><Input placeholder="e.g., Double, Suite" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="actual_checkin"
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
                name="actual_checkout"
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
              name="confirmation_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation Number</FormLabel>
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
              name="divergence_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Date Divergence (if any)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Explain why dates differ from expected..." {...field} />
                  </FormControl>
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
