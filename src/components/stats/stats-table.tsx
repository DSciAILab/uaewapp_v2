'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FighterStats } from '@/types/stats';
import { WeightClassBadge } from './weight-class-badge';
import { calculateRecord, formatHeight, formatReach } from '@/lib/services/stats-service';
import { getFighterPhotoUrl } from '@/lib/utils';

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
            <TableHead className="w-[60px]">Bout #</TableHead>
            <TableHead className="w-[80px]">Photo</TableHead>
            <TableHead>Fighter ID</TableHead>
            <TableHead className="min-w-[200px]">Name / Event</TableHead>
            <TableHead>Nationality</TableHead>
            <TableHead>Residency</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Height/Reach</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                No fighter stats found
              </TableCell>
            </TableRow>
          ) : (
            stats.map((s) => (
              <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onEdit(s)}>
                <TableCell>
                  {s.matchNumber ? (
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-black">
                      {s.matchNumber}
                    </div>
                  ) : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                   <Avatar className="h-10 w-10 border border-muted shadow-sm">
                     {s.person?.fighter_id? (
                       <AvatarImage 
                         src={getFighterPhotoUrl(s.person.fighter_id)} 
                         alt={s.person.compiled_name} 
                       />
                     ) : s.person?.passport_photo ? (
                        <AvatarImage src={s.person.passport_photo} alt={s.person.compiled_name} />
                     ) : null}
                     <AvatarFallback className="text-xs font-bold bg-muted/50">
                       {s.person?.compiled_name?.[0]}
                     </AvatarFallback>
                   </Avatar>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px] bg-background">
                    ID: {s.person?.fighter_id || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm leading-tight text-primary">
                      {s.person?.compiled_name}
                    </span>
                    <span className="text-[10px] italic text-muted-foreground mt-0.5">
                      {s.person?.event_name || 'UAEW'}
                    </span>
                  </div>
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
                <TableCell>
                  <Badge variant="outline" className="font-bold text-[10px]">{calculateRecord(s)}</Badge>
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
