'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, History } from 'lucide-react';
import { format } from 'date-fns';
import { getStatsChangeLog, type StatsChangeLogEntry } from '@/lib/services/stats-service';

/**
 * Who changed what, for one athlete's stats (Fernando, 2026-07-20).
 *
 * Opened from the table's own row action. Reads on open rather than with the
 * table: the log is the exception, not the thing 30 rows need on every render.
 */

/** Column names as the form labels them, so the log reads like the screen. */
const FIELD_LABELS: Record<string, string> = {
  height_cm: 'Height',
  reach_cm: 'Reach',
  weight_kg: 'Weight',
  weight_class: 'Weight class',
  corner: 'Corner',
  nickname: 'Nickname',
  fighting_style: 'Fighting style',
  team_gym: 'Team / Gym',
  residency: 'Residency',
  uniform_size: 'Uniform size',
  shoe_size: 'Shoe size',
  tshirt_size: 'T-shirt size',
  shorts_size: 'Shorts size',
  jacket_size: 'Jacket size',
  gloves_size: 'Gloves size',
  coach1_size: 'Coach 1 size',
  coach2_size: 'Coach 2 size',
  coach3_size: 'Coach 3 size',
  wins: 'Wins',
  losses: 'Losses',
  draws: 'Draws',
  no_contests: 'No contests',
  wins_ko: 'Wins by KO',
  wins_submission: 'Wins by submission',
  wins_decision: 'Wins by decision',
  losses_ko: 'Losses by KO',
  losses_submission: 'Losses by submission',
  losses_decision: 'Losses by decision',
};

const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

interface StatsChangeLogProps {
  personId: string | null;
  fighterName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatsChangeLog({ personId, fighterName, open, onOpenChange }: StatsChangeLogProps) {
  const [entries, setEntries] = useState<StatsChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !personId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    getStatsChangeLog(personId)
      .then((rows) => { if (!cancelled) setEntries(rows); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load'); })
      // Guarded against the dialog closing mid-request: without it, reopening on
      // another athlete can land the previous fighter's history under this name.
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, personId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Change log
          </DialogTitle>
          <DialogDescription>{fighterName}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-2 px-2">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
            </div>
          )}

          {!loading && error && (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          )}

          {/*
            An empty log and a broken log look identical if both render nothing,
            so say which this is — the wall taught that lesson today.
          */}
          {!loading && !error && entries.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No changes recorded yet. Edits made from now on appear here.
            </p>
          )}

          {!loading && !error && entries.length > 0 && (
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.id} className="py-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{fieldLabel(e.field)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(e.changedAt), 'dd MMM · HH:mm')}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                    <span className="text-muted-foreground line-through">{e.oldValue ?? '—'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{e.newValue ?? '—'}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {e.changedByName ?? 'unknown user'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
