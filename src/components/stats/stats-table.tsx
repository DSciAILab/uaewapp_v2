'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { FighterStats } from '@/types/stats';
import { WeightClassBadge } from './weight-class-badge';
import { calculateRecord, formatHeight, formatReach } from '@/lib/services/stats-service';

interface StatsTableProps {
  stats: FighterStats[];
  onEdit: (stats: FighterStats) => void;
}

export function StatsTable({ stats, onEdit }: StatsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fighter</TableHead>
            <TableHead>Nickname</TableHead>
            <TableHead>Weight Class</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Height</TableHead>
            <TableHead>Reach</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No fighter stats found
              </TableCell>
            </TableRow>
          ) : (
            stats.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.person?.compiled_name}</TableCell>
                <TableCell>
                  {s.nickname ? (
                    <span className="text-muted-foreground">"{s.nickname}"</span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {s.weight_class ? (
                    <WeightClassBadge weightClass={s.weight_class} />
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{calculateRecord(s)}</Badge>
                </TableCell>
                <TableCell>{s.height_cm ? formatHeight(s.height_cm) : '-'}</TableCell>
                <TableCell>{s.reach_cm ? formatReach(s.reach_cm) : '-'}</TableCell>
                <TableCell>{s.team_gym || '-'}</TableCell>
                <TableCell>
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
