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
import { MedicalExam, MedicalExamFormData, MedicalExamStatus, MEDICAL_EXAM_TYPES } from '@/types/pre-event';
import { createMedicalExam, updateMedicalExam } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';

const medicalExamSchema = z.object({
  enrolled_id: z.string().min(1, 'Please select a participant'),
  exam_type: z.string().min(1, 'Exam type is required'),
  examiner_name: z.string().optional(),
  facility_name: z.string().optional(),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  completed_date: z.string().optional(),
  status: z.enum(['pending', 'scheduled', 'completed', 'failed']),
  passed: z.boolean().optional(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  expiration_date: z.string().optional(),
  notes: z.string().optional(),
});

interface MedicalExamFormProps {
  eventId: string;
  enrolledList: Array<{ id: string; person: { full_name: string } }>;
  medicalExam?: MedicalExam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MedicalExamForm({ eventId, enrolledList, medicalExam, open, onOpenChange, onSuccess }: MedicalExamFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!medicalExam;

  const form = useForm<MedicalExamFormData>({
    resolver: zodResolver(medicalExamSchema),
    defaultValues: {
      enrolled_id: '',
      exam_type: 'Pre-fight Physical',
      examiner_name: '',
      facility_name: '',
      scheduled_date: '',
      scheduled_time: '',
      completed_date: '',
      status: 'pending',
      passed: undefined,
      findings: '',
      recommendations: '',
      expiration_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (medicalExam) {
      form.reset({
        enrolled_id: medicalExam.enrolled_id,
        exam_type: medicalExam.exam_type,
        examiner_name: medicalExam.examiner_name || '',
        facility_name: medicalExam.facility_name || '',
        scheduled_date: medicalExam.scheduled_date || '',
        scheduled_time: medicalExam.scheduled_time || '',
        completed_date: medicalExam.completed_date || '',
        status: medicalExam.status,
        passed: medicalExam.passed ?? undefined,
        findings: medicalExam.findings || '',
        recommendations: medicalExam.recommendations || '',
        expiration_date: medicalExam.expiration_date || '',
        notes: medicalExam.notes || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        exam_type: 'Pre-fight Physical',
        examiner_name: '',
        facility_name: '',
        scheduled_date: '',
        scheduled_time: '',
        completed_date: '',
        status: 'pending',
        passed: undefined,
        findings: '',
        recommendations: '',
        expiration_date: '',
        notes: '',
      });
    }
  }, [medicalExam, form]);

  const onSubmit = async (data: MedicalExamFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateMedicalExam(medicalExam.id, data);
        toast.success('Medical exam updated');
      } else {
        await createMedicalExam(eventId, data);
        toast.success('Medical exam added');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update medical exam' : 'Failed to add medical exam');
    } finally {
      setIsLoading(false);
    }
  };

  const statuses: { value: MedicalExamStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  const enrolledOptions = enrolledList.map((e) => ({
    value: e.id,
    label: e.person.full_name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Medical Exam' : 'Add Medical Exam'}</DialogTitle>
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
                name="exam_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MEDICAL_EXAM_TYPES.map((type) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="examiner_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Examiner Name</FormLabel>
                    <FormControl><Input placeholder="Dr. Name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facility_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facility</FormLabel>
                    <FormControl><Input placeholder="Clinic/Hospital" {...field} /></FormControl>
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

            <FormField
              control={form.control}
              name="findings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Findings</FormLabel>
                  <FormControl><Textarea placeholder="Exam findings..." {...field} /></FormControl>
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
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Medical Exam'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
