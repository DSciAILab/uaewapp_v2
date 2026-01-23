'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Play, ExternalLink } from 'lucide-react';
import { EntranceMusic, MusicStatus } from '@/types/music';
import { MusicStatusBadge } from './music-status-badge';
import { deleteMusic, updateMusicStatus, formatDuration } from '@/lib/services/music-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MusicTableProps {
  music: EntranceMusic[];
  onEdit: (music: EntranceMusic) => void;
  onRefresh: () => void;
}

export function MusicTable({ music, onEdit, onRefresh }: MusicTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Order</TableHead>
              <TableHead>Fighter</TableHead>
              <TableHead>Song</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {music.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No entrance music found
                </TableCell>
              </TableRow>
            ) : (
              music.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono">
                    {m.walkout_order ? `#${m.walkout_order}` : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{m.enrolled?.person?.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{m.song_title}</span>
                      {m.source_url && (
                        <a href={m.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{m.artist}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatDuration(m.start_time_seconds)}</Badge>
                  </TableCell>
                  <TableCell><MusicStatusBadge status={m.status} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(m)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        {m.source_url && (
                          <DropdownMenuItem asChild>
                            <a href={m.source_url} target="_blank" rel="noopener noreferrer">
                              <Play className="mr-2 h-4 w-4" />Preview
                            </a>
                          </DropdownMenuItem>
                        )}
                        {m.status !== 'confirmed' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(m.id, 'confirmed')}>
                            Mark Confirmed
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(m.id)}>
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
