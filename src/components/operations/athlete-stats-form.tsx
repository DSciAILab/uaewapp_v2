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

import { upsertFighterStats } from '@/lib/services/stats-service';
import { FighterStats, WEIGHT_CLASS_LABELS } from '@/types/stats';

const statsSchema = z.object({
  height_cm: z.coerce.number().min(0).optional(),
  reach_cm: z.coerce.number().min(0).optional(),
  weight_class: z.string().optional(),
  
  wins: z.coerce.number().min(0).default(0),
  losses: z.coerce.number().min(0).default(0),
  draws: z.coerce.number().min(0).default(0),
  no_contests: z.coerce.number().min(0).default(0),
  
  wins_ko: z.coerce.number().min(0).default(0),
  wins_submission: z.coerce.number().min(0).default(0),
  wins_decision: z.coerce.number().min(0).default(0),
  
  losses_ko: z.coerce.number().min(0).default(0),
  losses_submission: z.coerce.number().min(0).default(0),
  losses_decision: z.coerce.number().min(0).default(0),
  
  fighting_style: z.string().optional(),
  team_gym: z.string().optional(),
  nickname: z.string().optional(),
});

type StatsFormValues = z.infer<typeof statsSchema>;

interface AthleteStatsFormProps {
  personId: string;
  initialData?: FighterStats | null;
  onSuccess?: () => void;
}

export function AthleteStatsForm({ personId, initialData, onSuccess }: AthleteStatsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<StatsFormValues>({
    resolver: zodResolver(statsSchema) as any,
    defaultValues: {
      height_cm: initialData?.height_cm || undefined,
      reach_cm: initialData?.reach_cm || undefined,
      weight_class: initialData?.weight_class || undefined,
      
      wins: initialData?.wins || 0,
      losses: initialData?.losses || 0,
      draws: initialData?.draws || 0,
      no_contests: initialData?.no_contests || 0,
      
      wins_ko: initialData?.wins_ko || 0,
      wins_submission: initialData?.wins_submission || 0,
      wins_decision: initialData?.wins_decision || 0,
      
      losses_ko: initialData?.losses_ko || 0,
      losses_submission: initialData?.losses_submission || 0,
      losses_decision: initialData?.losses_decision || 0,
      
      fighting_style: initialData?.fighting_style || '',
      team_gym: initialData?.team_gym || '',
      nickname: initialData?.nickname || '',
    },
  });

  function onSubmit(values: StatsFormValues) {
    startTransition(async () => {
      try {
        await upsertFighterStats(personId, values as any);
        toast.success('Stats updated successfully');
        onSuccess?.();
      } catch (error) {
        toast.error('Failed to update stats');
        console.error(error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Athlete Stats</CardTitle>
        <CardDescription>
          Manage physical attributes and fight record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                name="reach_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reach (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="190" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="weight_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(WEIGHT_CLASS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                      <Input placeholder="The Spider" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="team_gym"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team / Gym</FormLabel>
                    <FormControl>
                      <Input placeholder="American Top Team" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Fight Record
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control as any}
                  name="wins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wins</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control as any}
                  name="losses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Losses</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control as any}
                  name="draws"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Draws</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control as any}
                  name="no_contests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No Contests</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Stats
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
