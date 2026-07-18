'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getActiveEvents } from '@/lib/services/events';
import { getDashboardMatrix, type DashboardMatrix, type MatrixRow } from '@/lib/services/dashboard-matrix';
import { STATUS_META, type TaskStatus, type TaskDef } from '@/lib/tasks-catalog';
import { DoneIcon, NotRequiredIcon } from '@/components/tasks/task-status-icons';

/*
 * Operations Board — the UAE Warriors "war room" (UAE-23).
 *
 * The chrome (topbar / left readiness rail / fight-paired grid) reproduces the
 * black + gold broadcast dashboard. The DATA is the DB matrix from
 * getDashboardMatrix, and the CELL COLOURS come from STATUS_META — Fernando's
 * scheme overrides the reference's palette (undecided is a loud fuchsia, not
 * red). The whole page is force-dark (a `dark` root) regardless of the app
 * theme, so the semi-transparent STATUS_META tones resolve against black as
 * intended; this is deliberate and scoped to this subtree only.
 */

const GOLD = '#FDB913';

const STATUS_ORDER: TaskStatus[] = ['undecided', 'pending', 'in_progress', 'done', 'not_requested', 'cancelled'];

// A cell counts toward progress only if the task was actually requested and is
// still going to happen — a cancelled athlete's task would otherwise hold the
// board below 100% forever (UAE-26).
const isRequested = (s: TaskStatus) => s !== 'not_requested' && s !== 'cancelled';

interface Fight {
  key: string;
  order: number | null;
  blue: MatrixRow | null;
  red: MatrixRow | null;
}

/** One task square, coloured by its status tone, with the matched glyphs. */
function TaskCell({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status];
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center text-[10px] font-bold uppercase tracking-wide sm:h-10 sm:w-10',
        meta.tone
      )}
      title={meta.label}
    >
      {status === 'done' ? (
        <DoneIcon className="h-4 w-4" />
      ) : status === 'not_requested' ? (
        <NotRequiredIcon className="h-4 w-4" />
      ) : status === 'cancelled' ? (
        <span aria-hidden="true">&times;</span>
      ) : status === 'undecided' ? (
        <span className="animate-pulse">?</span>
      ) : (
        <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
      )}
    </div>
  );
}

/** A fighter block: avatar with corner ring, name + ID, and the task strip. */
function Corner({ row, tasks, side }: { row: MatrixRow; tasks: readonly TaskDef[]; side: 'blue' | 'red' }) {
  const ring = side === 'blue' ? 'ring-[#3da9ff]' : 'ring-[#ff3b3b]';
  const initials = row.name.trim().slice(0, 2).toUpperCase() || '?';
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 px-3 py-2',
        side === 'red' && 'flex-row-reverse',
        // Still readable, clearly out: the row is a record, not a to-do.
        row.cancelled && 'opacity-45 grayscale'
      )}
    >
      <div className={cn('h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-900 ring-2 sm:h-12 sm:w-12', ring)}>
        {row.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.photoUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-sm font-black text-neutral-500">
            {initials}
          </span>
        )}
      </div>

      <div className={cn('flex min-w-0 flex-col gap-0.5', side === 'red' ? 'items-start text-left' : 'items-end text-right')}>
        <span
          className={cn(
            'max-w-full truncate font-display text-sm font-extrabold uppercase leading-tight tracking-tight text-white sm:text-base',
            row.cancelled && 'line-through'
          )}
        >
          {row.name}
        </span>
        <span className={cn('flex gap-2 font-mono text-[10px] text-neutral-500', side === 'red' && 'flex-row-reverse')}>
          <span>ID {row.fighterId || 'N/A'}</span>
          {row.cancelled && <span className="font-bold text-neutral-400">CANCELLED</span>}
        </span>
      </div>

      <div className={cn('ml-auto flex shrink-0 items-center gap-0.5', side === 'red' ? 'mr-0 flex-row-reverse' : '')}>
        {tasks.map((t) => (
          <TaskCell key={t.name} status={row.cells[t.name].status} />
        ))}
      </div>
    </div>
  );
}

/** The per-task strip header — mirrors the reference's blue/red .col-head. */
function TaskStrip({ tasks, side }: { tasks: readonly TaskDef[]; side: 'blue' | 'red' }) {
  return (
    <div className={cn('flex items-center gap-0.5', side === 'red' && 'flex-row-reverse')}>
      {tasks.map((t) => (
        <div key={t.name} className="flex h-9 w-9 flex-col items-center justify-center gap-0.5 sm:h-10 sm:w-10">
          <span className="font-mono text-[9px] font-medium uppercase leading-none text-neutral-500">{t.short}</span>
          {t.mode === 'auto' && <span className="font-mono text-[7px] uppercase leading-none text-neutral-700">auto</span>}
        </div>
      ))}
    </div>
  );
}

/** A thin gold/green progress bar with a labelled numerator/denominator. */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done >= total;
  return (
    <div className="h-1 w-full bg-neutral-800">
      <div
        className="h-full transition-[width] duration-700"
        style={{ width: `${pct}%`, background: complete ? '#00e676' : GOLD }}
      />
    </div>
  );
}

export default function OperationsBoardPage() {
  const [matrix, setMatrix] = useState<DashboardMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Search + status filter, applied at the fighter level.
  const rows = useMemo(() => {
    if (!matrix) return [] as MatrixRow[];
    const term = search.trim().toLowerCase();
    return matrix.rows.filter((r) => {
      if (term && !r.name.toLowerCase().includes(term) && !(r.fighterId || '').toLowerCase().includes(term)) {
        return false;
      }
      if (statusFilter !== 'all' && !matrix.tasks.some((t) => r.cells[t.name].status === statusFilter)) {
        return false;
      }
      return true;
    });
  }, [matrix, search, statusFilter]);

  // Pair the filtered roster into fights by fightOrder (blue-side / red-side).
  const fights = useMemo<Fight[]>(() => {
    const groups = new Map<string, MatrixRow[]>();
    const order: string[] = [];
    for (const r of rows) {
      const key = r.fightOrder != null ? `o${r.fightOrder}` : `x${r.enrollmentId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(r);
    }
    const out: Fight[] = [];
    for (const key of order) {
      const members = groups.get(key)!;
      const blue = members.find((m) => m.corner === 'BLUE') ?? null;
      const red = members.find((m) => m.corner === 'RED') ?? null;
      const placed = new Set([blue, red].filter(Boolean) as MatrixRow[]);
      const extras = members.filter((m) => !placed.has(m));
      // Corner-less fighters fill the blue side of their own row.
      const blueSide = blue ?? extras.shift() ?? null;
      out.push({ key, order: members[0].fightOrder, blue: blueSide, red });
      for (const e of extras) out.push({ key: `${key}-${e.enrollmentId}`, order: e.fightOrder, blue: e, red: null });
    }
    return out;
  }, [rows]);

  // Overall + per-task tallies (denominator excludes not_requested).
  const stats = useMemo(() => {
    const perTask: Record<string, { done: number; total: number }> = {};
    let overallDone = 0;
    let overallTotal = 0;
    const tasks = matrix?.tasks ?? [];
    for (const t of tasks) perTask[t.name] = { done: 0, total: 0 };
    for (const r of rows) {
      // A cancelled athlete stays on screen but leaves the maths entirely —
      // otherwise the board can never reach 100% (UAE-26).
      if (r.cancelled) continue;
      for (const t of tasks) {
        const s = r.cells[t.name].status;
        if (isRequested(s)) {
          perTask[t.name].total++;
          overallTotal++;
          if (s === 'done') {
            perTask[t.name].done++;
            overallDone++;
          }
        }
      }
    }
    return { perTask, overallDone, overallTotal };
  }, [matrix, rows]);

  const overallPct = stats.overallTotal ? Math.round((stats.overallDone / stats.overallTotal) * 100) : 0;
  const tasks = matrix?.tasks ?? [];

  return (
    <div className="dark flex h-full flex-col bg-black font-sans text-white">
      {/* ── TOPBAR ─────────────────────────────────────────── */}
      <header className="flex min-h-[56px] items-center gap-4 border-b border-neutral-900 px-4">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center border border-neutral-800 text-neutral-300 transition-colors hover:border-[#FDB913] hover:text-[#FDB913]"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span
          className="flex h-8 w-8 items-center justify-center font-display text-lg font-black text-black"
          style={{ background: GOLD }}
        >
          U
        </span>
        <h1 className="min-w-0 flex-1 truncate text-center font-display text-base font-black uppercase tracking-wider sm:text-xl">
          {matrix ? (
            <>
              <span style={{ color: GOLD }}>{matrix.eventName}</span>
              <span className="mx-2 font-normal text-neutral-700">/</span>
              <span className="text-neutral-300">Operations</span>
            </>
          ) : (
            <span className="text-neutral-300">Operations Board</span>
          )}
        </h1>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
          <span className="flex items-center gap-2 border border-[#00e676]/25 bg-[#00e676]/10 px-2.5 py-1 font-semibold text-[#00e676]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00e676]" />
            Live
          </span>
          {fetchedAt && (
            <span className="hidden text-neutral-300 tabular-nums sm:inline">
              {fetchedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center border border-neutral-800 text-neutral-300 transition-colors hover:border-[#FDB913] hover:text-[#FDB913] disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── SIDEBAR ──────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="hidden w-[280px] shrink-0 flex-col overflow-y-auto border-r border-neutral-900 bg-[#0a0a0a] lg:flex">
            {/* Search */}
            <div className="border-b border-neutral-900 p-4">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Find</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="FIGHTER / ID"
                  className="h-8 w-full border border-neutral-800 bg-transparent pl-8 pr-2 font-mono text-xs uppercase tracking-wider text-white placeholder:text-neutral-600 focus:border-[#FDB913] focus:outline-none"
                />
              </div>
            </div>

            {/* Overall */}
            <div className="border-b border-neutral-900 p-4">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Overall Readiness</span>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-display text-4xl font-extrabold leading-none tracking-tight" style={{ color: GOLD }}>
                  {overallPct}%
                </span>
                <span className="text-right font-mono text-[10px] uppercase text-neutral-500">
                  <span className="block text-sm font-semibold text-white">
                    {stats.overallDone}/{stats.overallTotal}
                  </span>
                  tasks done
                </span>
              </div>
              <ProgressBar done={stats.overallDone} total={stats.overallTotal} />
            </div>

            {/* Per task */}
            <div className="border-b border-neutral-900 p-4">
              <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Per Task</span>
              <div className="flex flex-col gap-3">
                {tasks.map((t) => {
                  const s = stats.perTask[t.name] ?? { done: 0, total: 0 };
                  return (
                    <div key={t.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wide text-neutral-300">
                        <span>
                          {t.short}
                          {t.mode === 'auto' && <span className="ml-1 text-[9px] text-neutral-600">auto</span>}
                        </span>
                        <span className="tabular-nums">
                          <span className="font-bold text-white">{s.done}</span>
                          <span className="text-neutral-600">/{s.total}</span>
                        </span>
                      </div>
                      <ProgressBar done={s.done} total={s.total} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status filter */}
            <div className="border-b border-neutral-900 p-4">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Filter</span>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'flex items-center gap-2 border px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-wider transition-colors',
                    statusFilter === 'all'
                      ? 'border-white bg-white/5 text-white'
                      : 'border-neutral-800 text-neutral-500 hover:text-white'
                  )}
                >
                  <span className="h-2 w-2" style={{ background: GOLD }} />
                  All
                </button>
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter((cur) => (cur === s ? 'all' : s))}
                    className={cn(
                      'flex items-center gap-2 border px-2.5 py-1.5 text-left font-mono text-[10px] uppercase tracking-wider transition-colors',
                      statusFilter === s
                        ? 'border-white bg-white/5 text-white'
                        : 'border-neutral-800 text-neutral-500 hover:text-white'
                    )}
                  >
                    <span className={cn('inline-flex h-4 w-4 items-center justify-center', STATUS_META[s].tone)}>
                      {s === 'done' ? <DoneIcon className="h-2.5 w-2.5" /> : s === 'not_requested' ? <NotRequiredIcon className="h-2.5 w-2.5" /> : null}
                    </span>
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="p-4">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Legend</span>
              <div className="flex flex-col gap-2">
                {STATUS_ORDER.map((s) => (
                  <span key={s} className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-wide text-neutral-400">
                    <span className={cn('inline-flex h-4 w-4 items-center justify-center', STATUS_META[s].tone)}>
                      {s === 'done' ? <DoneIcon className="h-2.5 w-2.5" /> : s === 'not_requested' ? <NotRequiredIcon className="h-2.5 w-2.5" /> : null}
                    </span>
                    {STATUS_META[s].label}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* ── MAIN GRID ────────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {loading && !matrix ? (
            <div className="flex flex-1 items-center justify-center font-mono text-sm uppercase tracking-widest text-neutral-500">
              Loading board…
            </div>
          ) : !matrix ? (
            <div className="flex flex-1 items-center justify-center font-mono text-sm uppercase tracking-widest text-neutral-600">
              No active event.
            </div>
          ) : fights.length === 0 ? (
            <div className="flex flex-1 items-center justify-center font-mono text-sm uppercase tracking-widest text-neutral-600">
              No fighters match.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              {/* Column header — task strips flank the bout column */}
              <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-neutral-900 bg-black px-2">
                <div className="flex justify-end pr-2">
                  <TaskStrip tasks={tasks} side="blue" />
                </div>
                <div className="px-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
                  Bout
                </div>
                <div className="flex justify-start pl-2">
                  <TaskStrip tasks={tasks} side="red" />
                </div>
              </div>

              {/* Fight rows */}
              {fights.map((f) => (
                <div
                  key={f.key}
                  className="grid grid-cols-[1fr_auto_1fr] items-stretch border-b border-neutral-900 transition-colors hover:bg-neutral-950"
                >
                  <div className="flex items-center justify-end">
                    {f.blue ? <Corner row={f.blue} tasks={tasks} side="blue" /> : <div className="px-3 py-2" />}
                  </div>

                  <div className="flex w-[90px] flex-col items-center justify-center gap-0.5 border-x border-neutral-900 bg-[#0a0a0a] px-4 py-2 sm:w-[120px]">
                    <span className="font-display text-2xl font-black leading-none tracking-tight text-white tabular-nums sm:text-3xl">
                      <span className="text-neutral-600">#</span>
                      {f.order ?? '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-start">
                    {f.red ? <Corner row={f.red} tasks={tasks} side="red" /> : <div className="px-3 py-2" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
