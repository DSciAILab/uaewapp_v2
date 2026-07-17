'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Play, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { EntranceMusic, MusicStatus } from '@/types/music';
import { MusicStatusBadge } from './music-status-badge';
import { deleteMusic, updateMusicStatus, formatDuration } from '@/lib/services/music-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFighterPhotoUrl } from '@/lib/utils';

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
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Photo</TableHead>
              <TableHead className="w-[60px] text-center">Fight #</TableHead>
              <TableHead className="w-[100px] text-center">Fighter ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Corner</TableHead>
              <TableHead>Music Source</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {music.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No entrance music found
                </TableCell>
              </TableRow>
            ) : (
              music.map((m) => (
                <TableRow 
                  key={m.id} 
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onEdit(m)}
                >
                  {/* FOTO */}
                  <TableCell>
                      <Avatar className="h-10 w-10 border border-muted shadow-sm">
                           <AvatarImage src={getFighterPhotoUrl(m.enrolled?.person?.appadmin_fighter_id)} />
                           <AvatarFallback className="text-xs font-bold bg-muted/50">
                               {(m.enrolled?.person?.compiled_name || '??').substring(0, 2).toUpperCase()}
                           </AvatarFallback>
                      </Avatar>
                  </TableCell>

                  {/* LUTA # (Placeholder) */}
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">-</span>
                  </TableCell>

                  {/* FIGHTER ID */}
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono text-[10px] bg-background">
                        {m.enrolled?.person?.appadmin_fighter_id || '-'}
                    </Badge>
                  </TableCell>

                  {/* NOME + EVENT NAME */}
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">{m.enrolled?.person?.compiled_name}</span>
                        {m.enrolled?.person?.event_name && (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.enrolled?.person?.event_name}</span>
                        )}
                    </div>
                  </TableCell>

                  {/* CORNER */}
                  <TableCell className="text-center">
                     {m.enrolled?.corner || m.enrolled?.corner_color ? (
                        <Badge className={`text-[10px] px-2 py-0 h-5 border-none shadow-sm uppercase justify-center min-w-[60px] ${
                            (m.enrolled?.corner || m.enrolled?.corner_color || '').toLowerCase() === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
                        }`}>
                            {m.enrolled?.corner || m.enrolled?.corner_color}
                        </Badge>
                     ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                     )}
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
