'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, History, AlertTriangle, CheckCircle } from 'lucide-react';
import { EventWeighIn } from '@/types/stats';
import { getEventWeighIns, kgToLbs } from '@/lib/services/stats-service';
import { format } from 'date-fns';
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
import { getFightCardPositions, type FightCardPosition } from '@/lib/services/fight-card-positions';

type SortKey = 'order' | 'corner' | 'fighter' | 'weightClass' | 'weight' | 'status' | 'time';

interface StatsHistoryProps {
  eventId: string;
}

export function StatsHistory({ eventId }: StatsHistoryProps) {
  const [weighIns, setWeighIns] = useState<EventWeighIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });

  useEffect(() => {
    async function load() {
      try {
        const data = await getEventWeighIns(eventId);
        setWeighIns(data);
        const people = data.map((w) => ({
          enrollmentId: w.enrolled_id,
          fullName: w.enrolled?.person?.compiled_name || '',
          ringName: w.enrolled?.person?.event_name,
        }));
        setPositions(await getFightCardPositions(eventId, people));
      } catch (err) {
        console.error('Failed to load weigh-ins:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [eventId]);

  const cornerOf = useCallback(
    (w: EventWeighIn): Corner => {
      const fromCard = positions.get(w.enrolled_id)?.corner;
      if (fromCard) return fromCard;
      // Falls back to the enrollment for an event whose card isn't published yet.
      const raw = (w.enrolled?.corner || '').toUpperCase();
      return raw === 'RED' || raw === 'BLUE' ? raw : null;
    },
    [positions]
  );

  const sorted = useMemo(() => {
    const value = (w: EventWeighIn): unknown => {
      switch (sort.key) {
        case 'order':
          return positions.get(w.enrolled_id)?.fightOrder ?? null;
        case 'corner':
          return cornerOf(w);
        case 'fighter':
          return w.enrolled?.person?.compiled_name;
        case 'weightClass':
          return w.enrolled?.stats?.weight_class;
        case 'weight':
          return w.official_weight_kg;
        case 'status':
          return w.made_weight ? 1 : 0;
        case 'time':
          return w.weigh_in_time;
        default:
          return null;
      }
    };

    const out = [...weighIns].sort((a, b) => compareValues(value(a), value(b)));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [weighIns, sort, positions, cornerOf]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  if (isLoading) return <div className="text-center py-8">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4" /> Weigh-ins Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weighIns.filter(w => w.made_weight).length} / {weighIns.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Athletes who made weight</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Weight Misses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {weighIns.filter(w => !w.made_weight).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require commission review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Detailed History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead column="order" label="#" sort={sort} onSort={toggleSort} className={FIGHT_ORDER_HEAD_CLASS} center />
                <SortableHead column="corner" label="Photo" sort={sort} onSort={toggleSort} className="w-[80px] text-center" center />
                <SortableHead column="fighter" label="Fighter" sort={sort} onSort={toggleSort} className="min-w-[240px]" />
                <SortableHead column="weightClass" label="Weight Class" sort={sort} onSort={toggleSort} />
                <SortableHead column="weight" label="Official Weight" sort={sort} onSort={toggleSort} />
                <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} />
                <SortableHead column="time" label="Time" sort={sort} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                    <FightOrderCell order={positions.get(w.enrolled_id)?.fightOrder} />
                  </TableCell>
                  <TableCell className="text-center p-2">
                    <div className="flex justify-center">
                      <FighterAvatar
                        name={w.enrolled?.person?.compiled_name || ''}
                        photoUrl={getFighterPhotoUrl(w.enrolled?.person?.appadmin_fighter_id)}
                        corner={cornerOf(w)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <FighterIdentity
                      name={w.enrolled?.person?.compiled_name || ''}
                      fighterId={
                        w.enrolled?.person?.appadmin_fighter_id != null
                          ? String(w.enrolled.person.appadmin_fighter_id)
                          : null
                      }
                      eventName={w.enrolled?.person?.event_name}
                    />
                  </TableCell>
                  <TableCell>
                    {w.enrolled?.stats?.weight_class || 'Catch Weight'}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono">
                      {w.official_weight_kg} kg
                      {w.official_weight_kg !== null && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({kgToLbs(w.official_weight_kg)} lbs)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {w.made_weight ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" /> Made Weight
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex flex-col items-start gap-1 p-2 h-auto">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Missed Weight
                        </div>
                        {w.weight_miss_kg && (
                          <span className="text-[10px] font-bold">
                            +{w.weight_miss_kg} kg miss
                          </span>
                        )}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {w.weigh_in_time ? format(new Date(w.weigh_in_time), 'HH:mm dd/MM') : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No weigh-in records found for this event.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
