'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Play, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { EntranceMusic, MusicStatus } from '@/types/music';
import { MusicStatusBadge } from './music-status-badge';
import { deleteMusic, updateMusicStatus, formatDuration } from '@/lib/services/music-service';
import { getEventById } from '@/lib/services/events';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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

type SortKey = 'order' | 'corner' | 'fighter' | 'music' | 'status';

// Rank, not alphabet: the rows that still need someone to act come first.
const STATUS_RANK: Record<MusicStatus, number> = {
  pending: 0,
  not_provided: 1,
  uploaded: 2,
  confirmed: 3,
};

interface MusicTableProps {
  music: EntranceMusic[];
  onEdit: (music: EntranceMusic) => void;
  onRefresh: () => void;
  onPreview: (music: EntranceMusic) => void;
}

export function MusicTable({ music, onEdit, onRefresh, onPreview }: MusicTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });

  const eventId = music[0]?.event_id;

  // The identity block's second line is the EVENT, not the athlete's ring name
  // (person.event_name is the ring name — the naming is a trap).
  const [eventName, setEventName] = useState<string | null>(null);
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    getEventById(eventId)
      .then((e) => { if (!cancelled) setEventName(e?.name ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    const people = music.map((m) => ({
      enrollmentId: m.enrolled_id,
      fullName: m.enrolled?.person?.compiled_name || '',
      ringName: m.enrolled?.person?.event_name,
    }));
    getFightCardPositions(eventId, people)
      .then((p) => {
        if (!cancelled) setPositions(p);
      })
      .catch((err) => console.warn('[music-table] fight card positions failed:', err));
    return () => {
      cancelled = true;
    };
  }, [eventId, music]);

  const cornerOf = useCallback(
    (m: EntranceMusic): Corner => {
      const fromCard = positions.get(m.enrolled_id)?.corner;
      if (fromCard) return fromCard;
      // The card is the source; the enrollment fields only carry an event whose
      // card hasn't been published yet.
      const raw = (m.enrolled?.corner || m.enrolled?.corner_color || '').toUpperCase();
      return raw === 'RED' || raw === 'BLUE' ? raw : null;
    },
    [positions]
  );

  const sorted = useMemo(() => {
    const value = (m: EntranceMusic): unknown => {
      switch (sort.key) {
        case 'order':
          return positions.get(m.enrolled_id)?.fightOrder ?? null;
        case 'corner':
          return cornerOf(m);
        case 'fighter':
          return m.enrolled?.person?.compiled_name;
        case 'music':
          return m.title_1 || m.source_url;
        case 'status':
          return STATUS_RANK[m.status];
        default:
          return null;
      }
    };

    const out = [...music].sort((a, b) => compareValues(value(a), value(b)));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [music, sort, positions, cornerOf]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await deleteMusic(deleteId);
      toast.success('Music deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete music');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (musicId: string, status: MusicStatus) => {
    try {
      await updateMusicStatus(musicId, status);
      toast.success('Status updated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortableHead column="order" label="#" sort={sort} onSort={toggleSort} className={FIGHT_ORDER_HEAD_CLASS} center />
              <SortableHead column="corner" label="Photo" sort={sort} onSort={toggleSort} className="w-[80px] text-center" center />
              <SortableHead column="fighter" label="Fighter" sort={sort} onSort={toggleSort} className="w-[240px]" />
              <SortableHead column="music" label="Music Source" sort={sort} onSort={toggleSort} />
              <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} className="text-center" center />
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No entrance music found
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((m) => (
                <TableRow
                  key={m.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onEdit(m)}
                >
                  <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                    <FightOrderCell order={positions.get(m.enrolled_id)?.fightOrder} />
                  </TableCell>

                  <TableCell className="text-center p-2">
                    <div className="flex justify-center">
                      <FighterAvatar
                        name={m.enrolled?.person?.compiled_name || ''}
                        photoUrl={getFighterPhotoUrl(m.enrolled?.person?.appadmin_fighter_id)}
                        corner={cornerOf(m)}
                      />
                    </div>
                  </TableCell>

                  <TableCell>
                    <FighterIdentity
                      name={m.enrolled?.person?.compiled_name || ''}
                      fighterId={m.enrolled?.person?.appadmin_fighter_id}
                      eventName={eventName}
                    />
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1.5 min-w-[180px]">
                      {m.source_url && (
                        <div className="flex items-center gap-2 group">
                           <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                             <ExternalLink className="h-3 w-3" /> Link 1
                           </a>
                           {m.source_url.includes('youtube') && <Badge variant="outline" className="text-[9px] px-1 py-0 h-3 border-red-200 text-red-600 bg-red-50">YT</Badge>}
                           <Badge variant="secondary" className="text-[10px] py-0 h-4 ml-auto">
                             {formatDuration(m.start_time_seconds)}
                           </Badge>
                        </div>
                      )}
                      {m.source_url_2 && (
                        <div className="flex items-center gap-2 group">
                           <a href={m.source_url_2} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                             <ExternalLink className="h-3 w-3" /> Link 2
                           </a>
                           <Badge variant="secondary" className="text-[10px] py-0 h-4 ml-auto">
                             {formatDuration(m.start_time_2)}
                           </Badge>
                        </div>
                      )}
                      {m.source_url_3 && (
                        <div className="flex items-center gap-2 group">
                           <a href={m.source_url_3} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline hover:text-blue-800 transition-colors">
                             <ExternalLink className="h-3 w-3" /> Link 3
                           </a>
                           <Badge variant="secondary" className="text-[10px] py-0 h-4 ml-auto">
                             {formatDuration(m.start_time_3)}
                           </Badge>
                        </div>
                      )}
                      {!m.source_url && !m.source_url_2 && !m.source_url_3 && (
                        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            No music
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><MusicStatusBadge status={m.status} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(m); }}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        {m.source_url && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(m); }}>
                            <Play className="mr-2 h-4 w-4" />Preview
                          </DropdownMenuItem>
                        )}
                        {m.status !== 'confirmed' && m.source_url && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(m.id, 'confirmed'); }}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Mark Confirmed
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Music?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
