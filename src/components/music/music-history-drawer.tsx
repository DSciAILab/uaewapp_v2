'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { History as HistoryIcon, Link2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MusicLogEntry } from '@/lib/services/music-service';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName: string;
  fetchHistory: () => Promise<MusicLogEntry[]>;
}

const FIELD_LABEL: Record<string, string> = {
  song_1: 'Song 1',
  song_2: 'Song 2',
  song_3: 'Song 3',
  status_1: 'Song 1 status',
  status_2: 'Song 2 status',
  status_3: 'Song 3 status',
  notes: 'Notes',
};

function fieldMeta(field: string) {
  if (field.startsWith('status')) return { icon: ShieldCheck, tone: 'text-emerald-600 dark:text-emerald-400' };
  if (field === 'notes') return { icon: MessageSquareText, tone: 'text-muted-foreground' };
  return { icon: Link2, tone: 'text-blue-600 dark:text-blue-400' };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shorten(v: string | null): string {
  if (!v) return '—';
  return v.length > 60 ? v.slice(0, 57) + '…' : v;
}

export function MusicHistoryDrawer({ open, onOpenChange, athleteName, fetchHistory }: Props) {
  const [entries, setEntries] = useState<MusicLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchHistory()
      .then((data) => { if (!cancelled) setEntries(data); })
      .catch((err) => {
        console.error('[MusicHistoryDrawer]', err);
        if (!cancelled) setEntries([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, fetchHistory]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-muted-foreground" />
            Walk-out Songs History
          </SheetTitle>
          <SheetDescription>{athleteName}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading && (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading history…</div>
          )}

          {!loading && entries.length === 0 && (
            <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No changes recorded yet.
            </div>
          )}

          {!loading && entries.length > 0 && (
            <ol className="relative border-l-2 border-border ml-2 space-y-5">
              {entries.map((entry) => {
                const meta = fieldMeta(entry.field);
                const Icon = meta.icon;
                return (
                  <li key={entry.id} className="ml-6 relative">
                    <span className="absolute -left-[34px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted-foreground/40 bg-background">
                      <Icon className={cn('h-3.5 w-3.5', meta.tone)} />
                    </span>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('font-bold text-sm', meta.tone)}>
                          {FIELD_LABEL[entry.field] || entry.field}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground max-w-[220px] truncate">
                          {shorten(entry.old_value)} → {shorten(entry.new_value)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(entry.changed_at)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
