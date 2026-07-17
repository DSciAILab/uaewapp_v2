'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TableHead } from '@/components/ui/table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The canonical way to show an athlete in any table (UAE-20).
 *
 * Every athlete row in this app reads the same: bout order on the left, a
 * photo ringed in the corner colour, then the name with its id and event
 * underneath. Screens import these instead of re-inventing the row, so a new
 * table is right by construction rather than by remembering.
 *
 * Reference implementation: Medical Clearance.
 */

export type Corner = 'RED' | 'BLUE' | null | undefined;

/**
 * Ring colour. Grey is meaningful: it marks someone who is NOT an active
 * fighter on this card — staff, a coach, or an athlete not paired yet — so a
 * missing corner never looks like a red/blue one.
 */
export const cornerRing = (corner: Corner) => {
  const c = (corner || '').toString().toUpperCase();
  if (c === 'RED') return 'border-red-600';
  if (c === 'BLUE') return 'border-blue-600';
  return 'border-muted';
};

interface FighterAvatarProps {
  name: string;
  photoUrl?: string | null;
  corner?: Corner;
  className?: string;
}

export function FighterAvatar({ name, photoUrl, corner, className }: FighterAvatarProps) {
  return (
    <Avatar className={cn('h-12 w-12 border-4 shadow-sm', cornerRing(corner), className)}>
      <AvatarImage src={photoUrl || ''} className="object-cover" />
      <AvatarFallback className="font-bold bg-muted text-muted-foreground">
        {(name || '??').substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

interface FighterIdentityProps {
  name: string;
  fighterId?: string | null;
  eventName?: string | null;
  /** Extra line under the id/event row (e.g. a role). */
  subtitle?: React.ReactNode;
  compact?: boolean;
}

/** Name + "ID: xxx" badge + event, the block that sits next to the photo. */
export function FighterIdentity({ name, fighterId, eventName, subtitle, compact }: FighterIdentityProps) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={cn('font-bold truncate', compact ? 'text-sm' : 'text-base')}>{name}</span>
      <div className="flex items-center gap-2 min-w-0">
        <Badge
          variant="outline"
          className="font-mono text-[10px] bg-background/80 text-muted-foreground border-muted-foreground/30 px-1 py-0 h-4 shrink-0"
        >
          ID: {fighterId || 'N/A'}
        </Badge>
        {eventName && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{eventName}</span>
        )}
        {subtitle}
      </div>
    </div>
  );
}

/** Photo + identity in one cell, for tables without a separate photo column. */
export function FighterCell({
  name,
  photoUrl,
  corner,
  fighterId,
  eventName,
  subtitle,
  compact,
}: FighterAvatarProps & FighterIdentityProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <FighterAvatar name={name} photoUrl={photoUrl} corner={corner} className={compact ? 'h-9 w-9 border-2' : undefined} />
      <FighterIdentity
        name={name}
        fighterId={fighterId}
        eventName={eventName}
        subtitle={subtitle}
        compact={compact}
      />
    </div>
  );
}

/** Bout order cell — the amber rail on the left of every athlete table. */
export function FightOrderCell({ order }: { order: number | null | undefined }) {
  return (
    <span className="block text-center font-bold text-lg text-amber-700/80 dark:text-amber-400/80">
      {order ?? '-'}
    </span>
  );
}

export const FIGHT_ORDER_CELL_CLASS = 'p-2 text-center bg-yellow-50/30 dark:bg-yellow-500/5';
export const FIGHT_ORDER_HEAD_CLASS = 'w-[60px] text-center bg-yellow-50/50 dark:bg-yellow-500/5';

/* ---------- Sortable headers ---------- */

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K | null;
  dir: SortDir;
}

/** Toggles asc/desc on the same key, or starts a new key at asc. */
export function nextSort<K extends string>(prev: SortState<K>, key: K): SortState<K> {
  return prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
}

export function SortIcon<K extends string>({ column, sort }: { column: K; sort: SortState<K> }) {
  if (sort.key !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/40" />;
  return sort.dir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
}

interface SortableHeadProps<K extends string> {
  column: K;
  label: string;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
  center?: boolean;
}

/** A <TableHead> whose label toggles sorting. Use for EVERY column. */
export function SortableHead<K extends string>({
  column,
  label,
  sort,
  onSort,
  className,
  center,
}: SortableHeadProps<K>) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center text-xs font-medium hover:text-foreground transition-colors',
          center && 'justify-center w-full'
        )}
      >
        {label}
        <SortIcon column={column} sort={sort} />
      </button>
    </TableHead>
  );
}

/**
 * Comparator for the common cases: numbers numerically, dates chronologically,
 * text naturally, with blanks always sinking to the bottom.
 */
export function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}
