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
import { RequiredDocument, RequiredDocumentFormData, DocumentStatus, DOCUMENT_TYPES } from '@/types/pre-event';
import { createDocument, updateDocument } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';

const documentSchema = z.object({
  enrolled_id: z.string().min(1, 'Please select a participant'),
  document_type: z.string().min(1, 'Document type is required'),
  document_name: z.string().min(1, 'Document name is required'),
  status: z.enum(['pending', 'submitted', 'approved', 'rejected', 'expired']),
  submitted_date: z.string().optional(),
  expiration_date: z.string().optional(),
  rejection_reason: z.string().optional(),
  notes: z.string().optional(),
});

interface DocumentFormProps {
  eventId: string;
  enrolledList: Array<{ id: string; person: { full_name: string } }>;
  document?: RequiredDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DocumentForm({ eventId, enrolledList, document, open, onOpenChange, onSuccess }: DocumentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!document;

  const form = useForm<RequiredDocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      enrolled_id: '',
      document_type: 'Passport',
      document_name: '',
      status: 'pending',
      submitted_date: '',
      expiration_date: '',
      rejection_reason: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (document) {
      form.reset({
        enrolled_id: document.enrolled_id,
        document_type: document.document_type,
        document_name: document.document_name,
        status: document.status,
        submitted_date: document.submitted_date || '',
        expiration_date: document.expiration_date || '',
        rejection_reason: document.rejection_reason || '',
        notes: document.notes || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        document_type: 'Passport',
        document_name: '',
        status: 'pending',
        submitted_date: '',
        expiration_date: '',
        rejection_reason: '',
        notes: '',
      });
    }
  }, [document, form]);

  const onSubmit = async (data: RequiredDocumentFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateDocument(document.id, data);
        toast.success('Document updated');
      } else {
        await createDocument(eventId, data);
        toast.success('Document added');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update document' : 'Failed to add document');
    } finally {
      setIsLoading(false);
    }
  };

  const statuses: { value: DocumentStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
  ];

  const enrolledOptions = enrolledList.map((e) => ({
    value: e.id,
    label: e.person.full_name,
  }));

  const watchStatus = form.watch('status');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Document' : 'Add Document'}</DialogTitle>
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
                name="document_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
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
              name="document_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., John Doe Passport" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="submitted_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submitted Date</FormLabel>
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

            {watchStatus === 'rejected' && (
              <FormField
                control={form.control}
                name="rejection_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <FormControl><Textarea placeholder="Reason for rejection..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Document'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
