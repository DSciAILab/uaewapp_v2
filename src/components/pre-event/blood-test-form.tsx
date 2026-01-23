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
import { Combobox } from '@/components/ui/combobox';
import { BloodTest, BloodTestFormData, BloodTestStatus, BloodTestResult, BLOOD_TEST_TYPES } from '@/types/pre-event';
import { createBloodTest, updateBloodTest } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';

const bloodTestSchema = z.object({
  enrolled_id: z.string().min(1, 'Please select a participant'),
  test_type: z.string().min(1, 'Test type is required'),
  lab_name: z.string().optional(),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  collection_date: z.string().optional(),
  status: z.enum(['pending', 'scheduled', 'collected', 'processing', 'completed', 'expired']),
  result: z.enum(['clear', 'flagged', 'failed', 'inconclusive']).nullable().optional(),
  result_date: z.string().optional(),
  result_notes: z.string().optional(),
  expiration_date: z.string().optional(),
  notes: z.string().optional(),
});

interface BloodTestFormProps {
  eventId: string;
  enrolledList: Array<{ id: string; person: { full_name: string } }>;
  bloodTest?: BloodTest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BloodTestForm({ eventId, enrolledList, bloodTest, open, onOpenChange, onSuccess }: BloodTestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!bloodTest;

  const form = useForm<BloodTestFormData>({
    resolver: zodResolver(bloodTestSchema),
    defaultValues: {
      enrolled_id: '',
      test_type: 'Standard Panel',
      lab_name: '',
      scheduled_date: '',
      scheduled_time: '',
      collection_date: '',
      status: 'pending',
      result: null,
      result_date: '',
      result_notes: '',
      expiration_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (bloodTest) {
      form.reset({
        enrolled_id: bloodTest.enrolled_id,
        test_type: bloodTest.test_type,
        lab_name: bloodTest.lab_name || '',
        scheduled_date: bloodTest.scheduled_date || '',
        scheduled_time: bloodTest.scheduled_time || '',
        collection_date: bloodTest.collection_date || '',
        status: bloodTest.status,
        result: bloodTest.result,
        result_date: bloodTest.result_date ? bloodTest.result_date.split('T')[0] : '',
        result_notes: bloodTest.result_notes || '',
        expiration_date: bloodTest.expiration_date || '',
        notes: bloodTest.notes || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        test_type: 'Standard Panel',
        lab_name: '',
        scheduled_date: '',
        scheduled_time: '',
        collection_date: '',
        status: 'pending',
        result: null,
        result_date: '',
        result_notes: '',
        expiration_date: '',
        notes: '',
      });
    }
  }, [bloodTest, form]);

  const onSubmit = async (data: BloodTestFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateBloodTest(bloodTest.id, data);
        toast.success('Blood test updated');
      } else {
        await createBloodTest(eventId, data);
        toast.success('Blood test added');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update blood test' : 'Failed to add blood test');
    } finally {
      setIsLoading(false);
    }
  };

  const statuses: { value: BloodTestStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'collected', label: 'Collected' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'expired', label: 'Expired' },
  ];

  const results: { value: BloodTestResult; label: string }[] = [
    { value: 'clear', label: 'Clear' },
    { value: 'flagged', label: 'Flagged' },
    { value: 'failed', label: 'Failed' },
    { value: 'inconclusive', label: 'Inconclusive' },
  ];

  const enrolledOptions = enrolledList.map((e) => ({
    value: e.id,
    label: e.person.full_name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Blood Test' : 'Add Blood Test'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="enrolled_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Participant *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={enrolledOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select participant"
                      searchPlaceholder="Search participant..."
                      emptyText="No participant found."
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="test_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {BLOOD_TEST_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
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
                        {statuses.map((stat) => (
                          <SelectItem key={stat.value} value={stat.value}>{stat.label}</SelectItem>
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
              name="lab_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Laboratory Name</FormLabel>
                  <FormControl><Input placeholder="Enter lab name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                name="expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-4">Results (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="result"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result</FormLabel>
                      <Select 
                        onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                        value={field.value || 'none'}
                      >
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Not Resulted</SelectItem>
                          {results.map((res) => (
                            <SelectItem key={res.value} value={res.value}>{res.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="result_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
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
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Blood Test'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
