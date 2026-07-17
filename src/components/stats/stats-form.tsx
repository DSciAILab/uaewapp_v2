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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FighterStats, FighterStatsFormData, WeightClass, WEIGHT_CLASS_LABELS } from '@/types/stats';
import { upsertFighterStats, getStatsFacets } from '@/lib/services/stats-service';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import { getFighterPhotoUrl } from '@/lib/utils';
import { toast } from 'sonner';

const statsSchema = z.object({
  height_cm: z.coerce.number().min(100).max(250).optional(),
  reach_cm: z.coerce.number().min(100).max(250).optional(),
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
  residency: z.string().optional(),
  weight_kg: z.coerce.number().min(0).optional(),
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
  const [styleOptions, setStyleOptions] = useState<string[]>([]);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);

  // Load the existing styles/teams when the dialog opens, so the dropdowns
  // offer what's already on record instead of an empty list.
  useEffect(() => {
    if (!open) return;
    getStatsFacets()
      .then(({ styles, teams }) => { setStyleOptions(styles); setTeamOptions(teams); })
      .catch(() => {});
  }, [open]);

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
      residency: '',
      weight_kg: undefined,
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
        residency: stats.residency || '',
        weight_kg: stats.weight_kg || undefined,
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
          <DialogTitle>Fighter Stats</DialogTitle>
        </DialogHeader>

        {stats?.person && (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-muted/50 mb-4">
             <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                {stats.person.appadmin_fighter_id ? (
                  <AvatarImage src={getFighterPhotoUrl(stats.person.appadmin_fighter_id)} alt={stats.person.compiled_name} />
                ) : stats.person.passport_photo ? (
                  <AvatarImage src={stats.person.passport_photo} alt={stats.person.compiled_name} />
                ) : null}
                <AvatarFallback>{stats.person.compiled_name[0]}</AvatarFallback>
             </Avatar>
             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-lg truncate leading-tight">{stats.person.compiled_name}</h4>
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">ID: {stats.person.appadmin_fighter_id || '-'}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground italic">
                   <span>{stats.person.event_name || 'UAEW'}</span>
                   <span>•</span>
                   <span>{stats.person.nationality || 'Unknown'}</span>
                </div>
             </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
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
                 <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Weight (kg)</FormLabel>
                      <FormControl><Input type="number" inputMode="decimal" step="0.1" placeholder="77.5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Physical Stats */}
            <div className="space-y-4">
              <h3 className="font-medium">Physical Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl><Input type="number" inputMode="numeric" placeholder="175" {...field} /></FormControl>
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
                      <FormControl><Input type="number" inputMode="numeric" placeholder="180" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="residency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residency</FormLabel>
                      <FormControl><Input placeholder="City, Country" {...field} /></FormControl>
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
                      <FormControl>
                        <CreatableCombobox
                          options={styleOptions}
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          placeholder="Select or type a style…"
                        />
                      </FormControl>
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
                      <FormControl>
                        <CreatableCombobox
                          options={teamOptions}
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          placeholder="Select or type a team…"
                        />
                      </FormControl>
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
