'use client';

import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Car } from 'lucide-react';
import { ChecklistStatus } from './checklist-status';
import { EventCar, CarPassengerFormData } from '@/types/transport';
import { LogisticsRowWithIdentity } from '@/lib/services/pre-event-service';
import {
  FIGHT_ORDER_CELL_CLASS,
  FIGHT_ORDER_HEAD_CLASS,
  FighterAvatar,
  FighterIdentity,
  FightOrderCell,
  SortableHead,
  compareValues,
  nextSort,
  type SortState,
} from '@/components/fighters/fighter-identity';
import {
  getFightCardPositions,
  type EnrollmentIdentity,
  type FightCardPosition,
} from '@/lib/services/fight-card-positions';
import { getFighterPhotoUrl } from '@/lib/utils';
import { assignPassenger } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface LogisticsTableProps {
  data: LogisticsRowWithIdentity[];
  cars: EventCar[];
  eventId: string;
  onRefresh: () => void;
}

type SortKey =
  | 'order'
  | 'athlete'
  | 'blood'
  | 'medical'
  | 'documents'
  | 'music'
  | 'uniform'
  | 'weight'
  | 'arrival'
  | 'departure';

export function LogisticsTable({ data, cars, eventId, onRefresh }: LogisticsTableProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());

  const people = useMemo<EnrollmentIdentity[]>(
    () =>
      data.map((row) => ({
        enrollmentId: row.enrolled_id,
        fullName: row.compiled_name,
        ringName: row.ring_name ?? null,
      })),
    [data]
  );

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    getFightCardPositions(eventId, people).then((result) => {
      if (!cancelled) setPositions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId, people]);

  const filteredData = useMemo(
    () => data.filter(row => row.compiled_name.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  );

  const sortedData = useMemo(() => {
    const valueOf = (row: LogisticsRowWithIdentity): unknown => {
      switch (sort.key) {
        case 'order':
          return positions.get(row.enrolled_id)?.fightOrder ?? null;
        case 'athlete':
          return row.compiled_name;
        case 'blood':
          return row.checklist.blood_test;
        case 'medical':
          return row.checklist.medical_exam;
        case 'documents':
          return row.checklist.documents;
        case 'music':
          return row.checklist.music;
        case 'uniform':
          return row.checklist.uniform;
        case 'weight':
          return row.checklist.weight;
        case 'arrival':
          return row.transport.arrival_car_number;
        case 'departure':
          return row.transport.departure_car_number;
        default:
          return null;
      }
    };
    const out = [...filteredData].sort((a, b) => compareValues(valueOf(a), valueOf(b)));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [filteredData, sort, positions]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const handleTransportAssign = async (enrolledId: string, carId: string, type: 'arrival' | 'departure') => {
    try {
      // If "none", remove assignment if exists? 
      // Current basic implementation assumes adding/switching.
      // Ideally we check if they already have an assignment of that type and remove it first or update.
      // For MVP: Simplest flow -> Assign.
      
      const formData: CarPassengerFormData = {
        enrolled_id: enrolledId,
        transport_type: type,
      };

      await assignPassenger(carId, formData);
      toast.success('Transport assigned');
      onRefresh();
    } catch (error) {
      toast.error('Failed to assign transport');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filter athletes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortableHead column="order" label="#" sort={sort} onSort={toggleSort} className={FIGHT_ORDER_HEAD_CLASS} center />
              <TableHead className="w-[80px] text-center">Photo</TableHead>
              <SortableHead column="athlete" label="Fighter" sort={sort} onSort={toggleSort} className="w-[240px]" />
              <SortableHead column="blood" label="Blood" sort={sort} onSort={toggleSort} className="text-center w-[50px] bg-blue-50/50" center />
              <SortableHead column="medical" label="Med" sort={sort} onSort={toggleSort} className="text-center w-[50px] bg-blue-50/50" center />
              <SortableHead column="documents" label="Docs" sort={sort} onSort={toggleSort} className="text-center w-[50px] bg-blue-50/50" center />
              <SortableHead column="music" label="Music" sort={sort} onSort={toggleSort} className="text-center w-[50px]" center />
              <SortableHead column="uniform" label="Kit" sort={sort} onSort={toggleSort} className="text-center w-[50px]" center />
              <SortableHead column="weight" label="Wght" sort={sort} onSort={toggleSort} className="text-center w-[50px]" center />
              <SortableHead column="arrival" label="Arrival" sort={sort} onSort={toggleSort} className="w-[180px] bg-slate-50/50 border-l border-r border-slate-200/60 text-center" center />
              <SortableHead column="departure" label="Departure" sort={sort} onSort={toggleSort} className="w-[180px] bg-slate-50/50 text-center" center />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => {
              const position = positions.get(row.enrolled_id);
              const roleName = row.role?.name || (typeof row.role === 'string' ? row.role : '');
              return (
              <TableRow key={row.enrolled_id} className="hover:bg-muted/30">
                <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                  <FightOrderCell order={position?.fightOrder} />
                </TableCell>

                <TableCell className="text-center p-2">
                  <div className="flex justify-center">
                    <FighterAvatar
                      name={row.compiled_name}
                      photoUrl={getFighterPhotoUrl(row.appadmin_fighter_id)}
                      corner={position?.corner}
                    />
                  </div>
                </TableCell>

                <TableCell>
                  <FighterIdentity
                    name={row.compiled_name}
                    fighterId={row.appadmin_fighter_id}
                    eventName={row.event_name}
                    subtitle={
                      roleName ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">{roleName}</Badge>
                      ) : null
                    }
                  />
                </TableCell>

                <TableCell className="text-center bg-blue-50/30">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.blood_test} type="blood" /></div>
                </TableCell>
                <TableCell className="text-center bg-blue-50/30">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.medical_exam} type="medical" /></div>
                </TableCell>
                <TableCell className="text-center bg-blue-50/30">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.documents} type="docs" /></div>
                </TableCell>
                
                <TableCell className="text-center">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.music} type="music" /></div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.uniform} type="uniform" /></div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.weight} type="weight" /></div>
                </TableCell>

                <TableCell className="bg-slate-50/30 border-l border-r border-slate-200/60 p-2">
                    {row.transport.arrival_car_id ? (
                        <div className="flex items-center gap-2 justify-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <Car className="h-3 w-3 mr-1" />
                                Car {row.transport.arrival_car_number}
                            </Badge>
                        </div>
                    ) : (
                        <Select onValueChange={(val) => handleTransportAssign(row.enrolled_id, val, 'arrival')}>
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Assign Car" />
                            </SelectTrigger>
                            <SelectContent>
                                {cars.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                        Car {c.car_number} {c.vehicle_type ? `(${c.vehicle_type})` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </TableCell>

                <TableCell className="bg-slate-50/30 p-2">
                    {row.transport.departure_car_id ? (
                        <div className="flex items-center gap-2 justify-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Car className="h-3 w-3 mr-1" />
                                Car {row.transport.departure_car_number}
                            </Badge>
                        </div>
                    ) : (
                        <Select onValueChange={(val) => handleTransportAssign(row.enrolled_id, val, 'departure')}>
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Assign Car" />
                            </SelectTrigger>
                            <SelectContent>
                                {cars.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                        Car {c.car_number} {c.vehicle_type ? `(${c.vehicle_type})` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </TableCell>
              </TableRow>
              );
            })}
            {sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No athletes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
