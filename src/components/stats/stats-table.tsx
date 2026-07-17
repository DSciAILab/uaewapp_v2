'use client';

import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { FighterStats } from '@/types/stats';
import { formatHeight, formatReach } from '@/lib/services/stats-service';
import { getFighterPhotoUrl } from '@/lib/utils';
import {
  FIGHT_ORDER_CELL_CLASS,
  FIGHT_ORDER_HEAD_CLASS,
  FighterAvatar,
  FighterIdentity,
  FightOrderCell,
  SortableHead,
  compareValues,
  nextSort,
  type Corner,
  type SortState,
} from '@/components/fighters/fighter-identity';
import { useFightCard, type CardPerson } from '@/hooks/use-fight-card';

type SortKey =
  | 'order'
  | 'corner'
  | 'fighter'
  | 'nationality'
  | 'residency'
  | 'weight'
  | 'height'
  | 'team';

interface StatsTableProps {
  stats: FighterStats[];
  eventId?: string;
  onEdit: (stats: FighterStats) => void;
}

/** Falls back to the row's own corner when the card has nothing for it. */
const cornerOf = (s: FighterStats): Corner => {
  const raw = (s.corner || '').toUpperCase();
  return raw === 'RED' || raw === 'BLUE' ? raw : null;
};

const photoOf = (s: FighterStats): string =>
  getFighterPhotoUrl(s.person?.appadmin_fighter_id) || s.person?.passport_photo || '';

export function StatsTable({ stats, eventId, onEdit }: StatsTableProps) {
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });

  // Same resolver as every other table: an exact join on mma_matches, with the
  // row's own corner kept only as the fallback.
  const people = useMemo<CardPerson[]>(
    () =>
      stats
        .filter((s) => s.enrollment_id)
        .map((s) => ({
          enrollmentId: s.enrollment_id!,
          fullName: s.person?.compiled_name ?? '',
          ringName: s.person?.event_name ?? null,
          eventId,
        })),
    [stats, eventId]
  );
  const { positions, eventNames } = useFightCard(people, 'stats-table');

  const posOf = (s: FighterStats) => (s.enrollment_id ? positions.get(s.enrollment_id) : undefined);
  const orderOf = (s: FighterStats) => posOf(s)?.fightOrder ?? s.matchNumber ?? null;
  const ringOf = (s: FighterStats): Corner => posOf(s)?.corner ?? cornerOf(s);

  const sorted = useMemo(() => {
    const value = (s: FighterStats): unknown => {
      switch (sort.key) {
        case 'order':
          return orderOf(s);
        case 'corner':
          return ringOf(s);
        case 'fighter':
          return s.person?.compiled_name;
        case 'nationality':
          return s.person?.nationality;
        case 'residency':
          return s.residency;
        case 'weight':
          return s.weight_kg ?? null;
        case 'height':
          return s.height_cm ?? null;
        case 'team':
          return s.team_gym;
        default:
          return null;
      }
    };

    const out = [...stats].sort((a, b) => compareValues(value(a), value(b)));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [stats, sort]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead column="order" label="#" sort={sort} onSort={toggleSort} className={FIGHT_ORDER_HEAD_CLASS} center />
            <SortableHead column="corner" label="Photo" sort={sort} onSort={toggleSort} className="w-[80px] text-center" center />
            <SortableHead column="fighter" label="Fighter" sort={sort} onSort={toggleSort} className="min-w-[240px]" />
            <SortableHead column="nationality" label="Nationality" sort={sort} onSort={toggleSort} />
            <SortableHead column="residency" label="Residency" sort={sort} onSort={toggleSort} />
            <SortableHead column="weight" label="Weight" sort={sort} onSort={toggleSort} />
            <SortableHead column="height" label="Height/Reach" sort={sort} onSort={toggleSort} />
            <SortableHead column="team" label="Team" sort={sort} onSort={toggleSort} />
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                No fighter stats found
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit(s)}>
                <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                  <FightOrderCell order={orderOf(s)} />
                </TableCell>
                <TableCell className="text-center p-2">
                  <div className="flex justify-center">
                    <FighterAvatar
                      name={s.person?.compiled_name || ''}
                      photoUrl={photoOf(s)}
                      corner={ringOf(s)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <FighterIdentity
                    name={s.person?.compiled_name || ''}
                    fighterId={s.person?.appadmin_fighter_id}
                    eventName={eventNames.get(eventId ?? '') ?? null}
                  />
                </TableCell>
                <TableCell>
                  {s.person?.nationality ? (
                    <Badge variant="secondary" className="font-normal text-[10px]">
                      {s.person.nationality}
                    </Badge>
                  ) : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="text-sm">
                   {s.residency || <span className="text-muted-foreground italic text-xs">Not informed</span>}
                </TableCell>
                <TableCell className="text-sm font-medium">
                   {s.weight_kg ? `${s.weight_kg} kg` : '-'}
                </TableCell>
                <TableCell className="text-[10px] whitespace-nowrap">
                   <div className="flex flex-col gap-0.5">
                      <span>H: {s.height_cm ? formatHeight(s.height_cm) : '-'}</span>
                      <span>R: {s.reach_cm ? formatReach(s.reach_cm) : '-'}</span>
                   </div>
                </TableCell>
                <TableCell className="text-xs max-w-[150px] truncate">{s.team_gym || '-'}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
