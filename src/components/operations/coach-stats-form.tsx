'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { upsertCoachData } from '@/lib/services/stats-service';
import { CoachData } from '@/types/stats';

const coachSchema = z.object({
  uniform_size: z.string().optional(),
  shoe_size: z.string().optional(),
  height_cm: z.coerce.number().min(0).optional(),
  weight_kg: z.coerce.number().min(0).optional(),
});

type CoachFormValues = z.infer<typeof coachSchema>;

interface CoachStatsFormProps {
  personId: string;
  initialData?: CoachData | null;
  onSuccess?: () => void;
}

export function CoachStatsForm({ personId, initialData, onSuccess }: CoachStatsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CoachFormValues>({
    resolver: zodResolver(coachSchema) as any,
    defaultValues: {
      uniform_size: initialData?.uniform_size || undefined,
      shoe_size: initialData?.shoe_size || undefined,
      height_cm: initialData?.height_cm || undefined,
      weight_kg: initialData?.weight_kg || undefined,
    },
  });

  function onSubmit(values: CoachFormValues) {
    startTransition(async () => {
      try {
        await upsertCoachData(personId, values as any);
        toast.success('Coach data updated successfully');
        onSuccess?.();
      } catch (error) {
        toast.error('Failed to update coach data');
        console.error(error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coach Data</CardTitle>
        <CardDescription>
          Manage uniforms and physical attributes for coaches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="uniform_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uniform Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="shoe_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shoe Size (US)</FormLabel>
                    <FormControl>
                      <Input placeholder="10.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="height_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="180" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="75" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Data
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
