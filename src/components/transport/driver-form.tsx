'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Driver, DriverFormData } from '@/types/transport';
import { createDriver, updateDriver } from '@/lib/services/transport-service';
import { toast } from 'sonner';

const driverSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  license_number: z.string().optional(),
  vehicle_info: z.string().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

interface DriverFormProps {
  driver?: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DriverForm({ driver, open, onOpenChange, onSuccess }: DriverFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!driver;

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      license_number: '',
      vehicle_info: '',
      is_active: true,
      notes: '',
    },
  });

  useEffect(() => {
    if (driver) {
      form.reset({
        full_name: driver.full_name,
        phone: driver.phone || '',
        email: driver.email || '',
        license_number: driver.license_number || '',
        vehicle_info: driver.vehicle_info || '',
        is_active: driver.is_active,
        notes: driver.notes || '',
      });
    } else {
      form.reset({
        full_name: '',
        phone: '',
        email: '',
        license_number: '',
        vehicle_info: '',
        is_active: true,
        notes: '',
      });
    }
  }, [driver, open, form]);

  const onSubmit = async (data: DriverFormData) => {
    setIsLoading(true);
    try {
      if (isEditing && driver) {
        await updateDriver(driver.id, data);
        toast.success('Driver updated successfully');
      } else {
        await createDriver(data);
        toast.success('Driver created successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save driver');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Driver' : 'New Driver'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+971 50 ..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl><Input placeholder="DL-12345" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
               )}
            />

            <FormField
              control={form.control}
              name="vehicle_info"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Vehicle Info (Default)</FormLabel>
                    <FormControl><Input placeholder="White Toyota Camry" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
               )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
