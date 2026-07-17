'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveEvents } from '@/lib/services/events';
import { getDashboardMatrix, type DashboardMatrix } from '@/lib/services/dashboard-matrix';
import { STATUS_META, type TaskStatus } from '@/lib/tasks-catalog';
import { DoneIcon, NotRequiredIcon } from '@/components/tasks/task-status-icons';

const AVATAR_BORDER = (corner: string | null) => {
  const c = (corner || '').toUpperCase();
  return c === 'RED' ? 'border-red-600' : c === 'BLUE' ? 'border-blue-600' : 'border-muted';
};

function StatusCell({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status];
  return (
    <div
      className={cn('flex items-center justify-center h-10 rounded-md text-[10px] font-semibold uppercase tracking-wide', meta.tone)}
      title={meta.label}
    >
      {status === 'done' ? (
        <DoneIcon className="h-4 w-4" />
      ) : status === 'not_requested' ? (
        <NotRequiredIcon className="h-4 w-4" />
      ) : status === 'undecided' ? (
        <span className="animate-pulse">?</span>
      ) : (
        <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
      )}
    </div>
  );
}

export default function OperationsBoardPage() {
  const [matrix, setMatrix] = useState<DashboardMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const events = await getActiveEvents();
      if (!events.length) {
        setMatrix(null);
        return;
      }
      const data = await getDashboardMatrix(events[0].id);
      setMatrix(data);
      setFetchedAt(new Date());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load the board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const rows = useMemo(() => {
    if (!matrix) return [];
    const term = search.trim().toLowerCase();
    return term
      ? matrix.rows.filter((r) => r.name.toLowerCase().includes(term) || (r.fighterId || '').toLowerCase().includes(term))
      : matrix.rows;
  }, [matrix, search]);

  // Per-task tally across the visible roster — the executive read.
  const tally = useMemo(() => {
    if (!matrix) return {};
    const out: Record<string, Record<TaskStatus, number>> = {};
    for (const t of matrix.tasks) out[t.name] = { undecided: 0, pending: 0, in_progress: 0, done: 0, not_requested: 0 };
    for (const r of rows) for (const t of matrix.tasks) out[t.name][r.cells[t.name].status]++;
    return out;
  }, [matrix, rows]);

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Operations Board"
        description={matrix ? `${matrix.eventName} — ${rows.length} fighters` : 'Task progress across the roster'}
      />

      <div className="flex-1 p-6 space-y-4 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search fighter or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          {fetchedAt && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Updated {fetchedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="outline" size="sm" className="h-9 ml-auto" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {(['undecided', 'pending', 'in_progress', 'done', 'not_requested'] as TaskStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn('inline-flex h-4 w-6 items-center justify-center rounded', STATUS_META[s].tone)}>
                {s === 'done' ? <DoneIcon className="h-3 w-3" /> : s === 'not_requested' ? <NotRequiredIcon className="h-3 w-3" /> : null}
              </span>
              <span className="text-muted-foreground">{STATUS_META[s].label}</span>
            </span>
          ))}
        </div>

        {/* Matrix */}
        {loading && !matrix ? (
          <div className="py-16 text-center text-muted-foreground">Loading board…</div>
        ) : !matrix || rows.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/10 p-12 text-center text-muted-foreground">
            {!matrix ? 'No active event.' : 'No fighters match your search.'}
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  <th className="sticky left-0 z-20 bg-card p-2 text-left w-[60px] border-b">#</th>
                  <th className="sticky left-[60px] z-20 bg-card p-2 text-left min-w-[220px] border-b">Fighter</th>
                  {matrix.tasks.map((t) => (
                    <th key={t.name} className="p-2 text-center min-w-[92px] border-b border-l">
                      <div className="text-xs font-semibold">{t.short}</div>
                      {t.mode === 'auto' && <div className="text-[9px] text-muted-foreground font-normal">auto</div>}
                    </th>
                  ))}
                </tr>
                {/* Per-task tally row */}
                <tr className="text-[10px]">
                  <th className="sticky left-0 z-20 bg-card border-b" />
                  <th className="sticky left-[60px] z-20 bg-card p-1 text-right text-muted-foreground font-normal border-b">done / total</th>
                  {matrix.tasks.map((t) => {
                    const c = tally[t.name];
                    const total = rows.length - (c?.not_requested ?? 0);
                    return (
                      <th key={t.name} className="p-1 text-center border-b border-l font-normal">
                        <span className="text-emerald-600 font-bold">{c?.done ?? 0}</span>
                        <span className="text-muted-foreground">/{total}</span>
                        {(c?.undecided ?? 0) > 0 && (
                          <span className="ml-1 text-fuchsia-600 font-bold" title="No status">·{c.undecided}?</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.enrollmentId} className="hover:bg-muted/20">
                    <td className="sticky left-0 z-10 bg-card p-2 text-center font-bold text-lg text-amber-700/80 dark:text-amber-400/80 border-b bg-yellow-50/30 dark:bg-yellow-500/5">
                      {r.fightOrder ?? '-'}
                    </td>
                    <td className="sticky left-[60px] z-10 bg-card p-2 border-b">
                      <div className="flex items-center gap-2.5">
                        <Avatar className={cn('h-9 w-9 border-2 shrink-0', AVATAR_BORDER(r.corner))}>
                          <AvatarImage src={r.photoUrl} className="object-cover" />
                          <AvatarFallback className="text-[10px] font-bold bg-muted">
                            {r.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{r.name}</p>
                          <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4">
                            ID: {r.fighterId || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    {matrix.tasks.map((t) => (
                      <td key={t.name} className="p-1.5 border-b border-l">
                        <StatusCell status={r.cells[t.name].status} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
