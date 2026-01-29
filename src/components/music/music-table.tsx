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
  onPreview: (music: EntranceMusic) => void;
}

export function MusicTable({ music, onEdit, onRefresh, onPreview }: MusicTableProps) {
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
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fighter</TableHead>
              <TableHead>Source Links & Start Times</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {music.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No entrance music found
                </TableCell>
              </TableRow>
            ) : (
              music.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.enrolled?.person?.full_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {m.source_url && (
                        <div className="flex items-center gap-2 group">
                           <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                             <ExternalLink className="h-3 w-3" /> Link 1
                           </a>
                           <Badge variant="secondary" className="text-[10px] py-0 h-4">
                             {formatDuration(m.start_time_seconds)}
                           </Badge>
                        </div>
                      )}
                      {m.source_url_2 && (
                        <div className="flex items-center gap-2 group">
                           <a href={m.source_url_2} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                             <ExternalLink className="h-3 w-3" /> Link 2
                           </a>
                           <Badge variant="secondary" className="text-[10px] py-0 h-4">
                             {formatDuration(m.start_time_2)}
                           </Badge>
                        </div>
                      )}
                      {m.source_url_3 && (
                        <div className="flex items-center gap-2 group">
                           <a href={m.source_url_3} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                             <ExternalLink className="h-3 w-3" /> Link 3
                           </a>
                           <Badge variant="secondary" className="text-[10px] py-0 h-4">
                             {formatDuration(m.start_time_3)}
                           </Badge>
                        </div>
                      )}
                      {!m.source_url && !m.source_url_2 && !m.source_url_3 && (
                        <span className="text-xs text-muted-foreground italic">No links provided</span>
                      )}
                    </div>
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
                          <DropdownMenuItem onClick={() => onPreview(m)}>
                            <Play className="mr-2 h-4 w-4" />Preview
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
