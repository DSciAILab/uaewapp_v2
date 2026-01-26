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
import { FighterStats, FighterStatsFormData, WeightClass, WEIGHT_CLASS_LABELS } from '@/types/stats';
import { upsertFighterStats } from '@/lib/services/stats-service';
import { toast } from 'sonner';

const statsSchema = z.object({
  height_cm: z.coerce.number().min(100).max(250).optional(),
  reach_cm: z.coerce.number().min(100).max(250).optional(),
  weight_class: z.string().optional(),
  wins: z.coerce.number().min(0),
  losses: z.coerce.number().min(0),
  draws: z.coerce.number().min(0),
  no_contests: z.coerce.number().min(0),
  wins_ko: z.coerce.number().min(0),
  wins_submission: z.coerce.number().min(0),
  wins_decision: z.coerce.number().min(0),
  losses_ko: z.coerce.number().min(0),
  losses_submission: z.coerce.number().min(0),
  losses_decision: z.coerce.number().min(0),
  fighting_style: z.string().optional(),
  team_gym: z.string().optional(),
  nickname: z.string().optional(),
});

interface StatsFormProps {
  personId: string;
  personName: string;
  stats?: FighterStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StatsForm({ personId, personName, stats, open, onOpenChange, onSuccess }: StatsFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FighterStatsFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(statsSchema) as any,
    defaultValues: {
      height_cm: undefined,
      reach_cm: undefined,
      weight_class: undefined,
      wins: 0,
      losses: 0,
      draws: 0,
      no_contests: 0,
      wins_ko: 0,
      wins_submission: 0,
      wins_decision: 0,
      losses_ko: 0,
      losses_submission: 0,
      losses_decision: 0,
      fighting_style: '',
      team_gym: '',
      nickname: '',
    },
  });

  useEffect(() => {
    if (stats) {
      form.reset({
        height_cm: stats.height_cm || undefined,
        reach_cm: stats.reach_cm || undefined,
        weight_class: stats.weight_class || undefined,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        no_contests: stats.no_contests,
        wins_ko: stats.wins_ko,
        wins_submission: stats.wins_submission,
        wins_decision: stats.wins_decision,
        losses_ko: stats.losses_ko,
        losses_submission: stats.losses_submission,
        losses_decision: stats.losses_decision,
        fighting_style: stats.fighting_style || '',
        team_gym: stats.team_gym || '',
        nickname: stats.nickname || '',
      });
    }
  }, [stats, form]);

  const onSubmit = async (data: FighterStatsFormData) => {
    setIsLoading(true);
    try {
      await upsertFighterStats(personId, data);
      toast.success('Fighter stats saved');
      onSuccess();
      onOpenChange(false);
    } catch (_error) {
      toast.error('Failed to save stats');
    } finally {
      setIsLoading(false);
    }
  };

  const weightClasses = Object.entries(WEIGHT_CLASS_LABELS) as [WeightClass, string][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fighter Stats - {personName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname</FormLabel>
                      <FormControl><Input placeholder="e.g., The Notorious" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight_class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {weightClasses.map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Physical Stats */}
            <div className="space-y-4">
              <h3 className="font-medium">Physical Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl><Input type="number" placeholder="175" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reach_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reach (cm)</FormLabel>
                      <FormControl><Input type="number" placeholder="180" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Fight Record */}
            <div className="space-y-4">
              <h3 className="font-medium">Fight Record</h3>
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="wins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wins</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="losses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Losses</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="draws"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Draws</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="no_contests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NC</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Win Methods */}
            <div className="space-y-4">
              <h3 className="font-medium">Win Methods</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="wins_ko"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KO/TKO</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wins_submission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wins_decision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Loss Methods */}
            <div className="space-y-4">
              <h3 className="font-medium">Loss Methods</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="losses_ko"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KO/TKO</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="losses_submission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Submission</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="losses_decision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Additional Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fighting_style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fighting Style</FormLabel>
                      <FormControl><Input placeholder="e.g., Boxing, Wrestling, BJJ" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="team_gym"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team/Gym</FormLabel>
                      <FormControl><Input placeholder="e.g., American Top Team" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Stats'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
