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
import { Batch, BatchFormData, BatchType, BatchStatus, BATCH_TYPE_LABELS, BATCH_STATUS_LABELS } from '@/types/batch';
import { createBatch, updateBatch } from '@/lib/services/batch-service';
import { toast } from 'sonner';

const batchSchema = z.object({
  batch_type: z.enum(['weigh_in', 'medical', 'credentials', 'media', 'rules_meeting', 'custom']),
  name: z.string().min(1, 'Name is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  location: z.string().optional(),
  room: z.string().optional(),
  max_capacity: z.coerce.number().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

interface BatchFormProps {
  eventId: string;
  batch?: Batch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchForm({ eventId, batch, open, onOpenChange, onSuccess }: BatchFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!batch;

  const form = useForm<BatchFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(batchSchema) as any,
    defaultValues: {
      batch_type: 'weigh_in' as BatchType,
      name: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '',
      location: '',
      room: '',
      max_capacity: undefined,
      status: 'scheduled' as BatchStatus,
      notes: '',
    },
  });

  useEffect(() => {
    if (batch) {
      form.reset({
        batch_type: batch.batch_type,
        name: batch.name || '',
        scheduled_date: batch.scheduled_date,
        start_time: batch.start_time.slice(0, 5),
        end_time: batch.end_time ? batch.end_time.slice(0, 5) : '',
        location: batch.location || '',
        room: batch.room || '',
        max_capacity: batch.max_capacity,
        status: batch.status,
        notes: batch.notes || '',
      });
    } else {
      form.reset({
        batch_type: 'weigh_in',
        name: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '',
        location: '',
        room: '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        max_capacity: null as any,
        status: 'scheduled',
        notes: '',
      });
    }
  }, [batch, form]);

  const onSubmit = async (data: BatchFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateBatch(batch.id, data);
        toast.success('Batch updated');
      } else {
        await createBatch(eventId, data);
        toast.success('Batch created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (_error) {
      toast.error(isEditing ? 'Failed to update batch' : 'Failed to create batch');
    } finally {
      setIsLoading(false);
    }
  };

  const batchTypes = Object.entries(BATCH_TYPE_LABELS) as [BatchType, string][];
  const statuses = Object.entries(BATCH_STATUS_LABELS) as [BatchStatus, string][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Batch' : 'New Batch'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {batchTypes.map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {statuses.map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Weigh-in Batch A" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Date *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="Hotel Lounge" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <FormControl><Input placeholder="Room 402" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="max_capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Capacity</FormLabel>
                  <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                {...field} 
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                              /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create Batch'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
