'use client';

import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { DocumentStatus } from '@/types/pre-event';
import { RequiredDocumentRow, deleteDocument, updateDocumentStatus } from '@/lib/services/pre-event-service';
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
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DocumentsTableProps {
  documents: RequiredDocumentRow[];
  onEdit: (doc: RequiredDocumentRow) => void;
  onRefresh: () => void;
}

type SortKey = 'order' | 'athlete' | 'document_type' | 'document_name' | 'submitted' | 'status' | 'expiration';

const statusColors: Record<DocumentStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
};

export function DocumentsTable({ documents, onEdit, onRefresh }: DocumentsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());

  // Every row here belongs to the same event, so the id rides along with the
  // data instead of being threaded through the page as one more prop.
  const eventId = documents[0]?.event_id ?? '';

  // One entry per athlete: a fighter has many documents, and the CSV fallback
  // should be asked about each person once.
  const people = useMemo<EnrollmentIdentity[]>(() => {
    const byEnrollment = new Map<string, EnrollmentIdentity>();
    for (const doc of documents) {
      if (byEnrollment.has(doc.enrolled_id)) continue;
      byEnrollment.set(doc.enrolled_id, {
        enrollmentId: doc.enrolled_id,
        fullName: doc.enrolled?.person?.compiled_name ?? '',
        ringName: doc.enrolled?.person?.ring_name ?? null,
      });
    }
    return [...byEnrollment.values()];
  }, [documents]);

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

  const sorted = useMemo(() => {
    const valueOf = (doc: RequiredDocumentRow): unknown => {
      switch (sort.key) {
        case 'order':
          return positions.get(doc.enrolled_id)?.fightOrder ?? null;
        case 'athlete':
          return doc.enrolled?.person?.compiled_name ?? '';
        case 'document_type':
          return doc.document_type;
        case 'document_name':
          return doc.document_name;
        case 'submitted':
          return doc.submitted_date;
        case 'status':
          return doc.status;
        case 'expiration':
          return doc.expiration_date;
        default:
          return null;
      }
    };
    const out = [...documents].sort((a, b) => compareValues(valueOf(a), valueOf(b)));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [documents, sort, positions]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDocument(deleteId);
      toast.success('Document deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleUpdateStatus = async (docId: string, status: DocumentStatus) => {
    try {
      await updateDocumentStatus(docId, status);
      toast.success(`Marked as ${status}`);
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
              <SortableHead column="order" label="#" sort={sort} onSort={toggleSort} className={FIGHT_ORDER_HEAD_CLASS} center />
              <TableHead className="w-[80px] text-center">Photo</TableHead>
              <SortableHead column="athlete" label="Fighter" sort={sort} onSort={toggleSort} className="w-[280px]" />
              <SortableHead column="document_type" label="Document Type" sort={sort} onSort={toggleSort} />
              <SortableHead column="document_name" label="Document Name" sort={sort} onSort={toggleSort} />
              <SortableHead column="submitted" label="Submitted" sort={sort} onSort={toggleSort} />
              <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} />
              <SortableHead column="expiration" label="Expiration" sort={sort} onSort={toggleSort} />
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((doc) => {
                const position = positions.get(doc.enrolled_id);
                const name = doc.enrolled?.person?.compiled_name ?? '';
                const fighterId = doc.enrolled?.person?.appadmin_fighter_id;
                return (
                <TableRow key={doc.id}>
                  <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                    <FightOrderCell order={position?.fightOrder} />
                  </TableCell>
                  <TableCell className="text-center p-2">
                    <div className="flex justify-center">
                      <FighterAvatar name={name} photoUrl={getFighterPhotoUrl(fighterId)} corner={position?.corner} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <FighterIdentity name={name} fighterId={fighterId} eventName={doc.enrolled?.event_name} />
                  </TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {doc.document_name}
                      {doc.file_path && (
                        <a href={doc.file_path} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.submitted_date ? format(new Date(doc.submitted_date + 'T00:00:00'), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[doc.status]}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc.expiration_date ? (
                      <span className={new Date(doc.expiration_date) < new Date() ? 'text-red-500 font-medium' : ''}>
                        {format(new Date(doc.expiration_date + 'T00:00:00'), 'MMM dd, yyyy')}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(doc)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateStatus(doc.id, 'approved')}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(doc.id, 'rejected')}>
                          <XCircle className="mr-2 h-4 w-4 text-red-600" />Reject
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(doc.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
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
