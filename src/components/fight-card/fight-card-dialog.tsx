'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, Minimize2, RefreshCw, Search, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActiveEvents } from '@/lib/services/events';
import { loadFightCard, type FightCardMatch } from '@/lib/services/fight-card';

interface FightCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Quick-look fight card (UAE-20).
 *
 * Read-only by design: this is for checking a pairing without losing the
 * screen you're on. Editing, PDF export and CSV sync stay on the full page.
 *
 * Resolves the ACTIVE event rather than taking an id — it's reachable from
 * everywhere, including screens that have no event in their route.
 */
export function FightCardDialog({ open, onOpenChange }: FightCardDialogProps) {
  const [matches, setMatches] = useState<FightCardMatch[]>([]);
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const events = await getActiveEvents();
      if (!events.length) {
        setError('No active event.');
        setMatches([]);
        return;
      }
      const data = await loadFightCard(events[0].id);
      setEventName(data.event?.name || events[0].name);
      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the fight card');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open only: this dialog hangs off every screen, so loading it
  // eagerly would cost every page a fight-card fetch nobody asked for.
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? matches.filter((m) =>
        [m.red?.name, m.blue?.name, m.division, String(m.matchNumber)]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(term))
      )
    : matches;

  const Fighter = ({ f, corner }: { f: FightCardMatch['red']; corner: 'RED' | 'BLUE' }) => {
    const isRed = corner === 'RED';
    return (
      <div className={cn('flex items-center gap-2 flex-1 min-w-0', !isRed && 'flex-row-reverse text-right')}>
        <Avatar className={cn('h-9 w-9 border-2 shrink-0', isRed ? 'border-red-600' : 'border-blue-600')}>
          <AvatarImage src={f?.photoUrl || ''} className="object-cover" />
          <AvatarFallback className="text-[10px] font-bold bg-muted">
            {(f?.name || '?').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{f?.name || 'TBA'}</p>
          {f?.record && <p className="text-[10px] text-muted-foreground tabular-nums">{f.record}</p>}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 transition-all duration-200 flex flex-col',
          expanded ? 'max-w-[98vw] w-[98vw] h-[95vh]' : 'max-w-2xl max-h-[85vh]'
        )}
      >
        <DialogTitle className="sr-only">Fight Card</DialogTitle>
        <DialogDescription className="sr-only">
          Quick reference of the active event&apos;s fight card
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Swords className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">Fight Card</p>
            <p className="text-[10px] text-muted-foreground truncate">{eventName || '—'}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {filtered.length} {filtered.length === 1 ? 'fight' : 'fights'}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? 'Shrink' : 'Expand to full screen'}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search fighter, division, match..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Matches */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading fight card…</p>
          ) : error ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {matches.length === 0 ? 'No fights on the card yet.' : 'No fights match your search.'}
            </p>
          ) : (
            <div className={cn('gap-2', expanded ? 'grid md:grid-cols-2' : 'space-y-2')}>
              {filtered.map((m) => (
                <div key={m.matchNumber} className="rounded-lg border bg-card p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground">#{m.matchNumber}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                      {m.division || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fighter f={m.red} corner="RED" />
                    <span className="text-[10px] font-bold text-muted-foreground shrink-0">VS</span>
                    <Fighter f={m.blue} corner="BLUE" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
