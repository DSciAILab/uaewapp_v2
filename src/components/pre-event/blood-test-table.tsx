'use client';

import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { BloodTestStatus, BloodTestResult } from '@/types/pre-event';
import { BloodTestRow, deleteBloodTest, updateBloodTestResult } from '@/lib/services/pre-event-service';
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

interface BloodTestTableProps {
  bloodTests: BloodTestRow[];
  onEdit: (test: BloodTestRow) => void;
  onRefresh: () => void;
}

type SortKey = 'order' | 'athlete' | 'test_type' | 'date' | 'status' | 'result' | 'expiration';

const statusColors: Record<BloodTestStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  collected: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
};

const resultColors: Record<BloodTestResult, string> = {
  clear: 'bg-green-100 text-green-800',
  flagged: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  inconclusive: 'bg-gray-100 text-gray-800',
};

export function BloodTestTable({ bloodTests, onEdit, onRefresh }: BloodTestTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());

  // Every row here belongs to the same event, so the id rides along with the
  // data instead of being threaded through the page as one more prop.
  const eventId = bloodTests[0]?.event_id ?? '';

  // One entry per athlete: a fighter can have several blood tests, and the CSV
  // fallback should be asked about each person once.
  const people = useMemo<EnrollmentIdentity[]>(() => {
    const byEnrollment = new Map<string, EnrollmentIdentity>();
    for (const test of bloodTests) {
      if (byEnrollment.has(test.enrolled_id)) continue;
      byEnrollment.set(test.enrolled_id, {
        enrollmentId: test.enrolled_id,
        fullName: test.enrolled?.person?.compiled_name ?? '',
        ringName: test.enrolled?.person?.ring_name ?? null,
      });
    }
    return [...byEnrollment.values()];
  }, [bloodTests]);

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
    const valueOf = (test: BloodTestRow): unknown => {
      switch (sort.key) {
        case 'order':
          return positions.get(test.enrolled_id)?.fightOrder ?? null;
        case 'athlete':
          return test.enrolled?.person?.compiled_name ?? '';
        case 'test_type':
          return test.test_type;
        case 'date':
          return test.scheduled_date;
        case 'status':
          return test.status;
        case 'result':
          return test.result;
        case 'expiration':
          return test.expiration_date;
        default:
          return null;
      }
    };
    const out = [...bloodTests].sort((a, b) => compareValues(valueOf(a), valueOf(b)));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [bloodTests, sort, positions]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteBloodTest(deleteId);
      toast.success('Blood test deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete blood test');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleUpdateResult = async (testId: string, result: BloodTestResult) => {
    try {
      await updateBloodTestResult(testId, result);
      toast.success(`Marked as ${result}`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update result');
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
              <SortableHead column="test_type" label="Test Type" sort={sort} onSort={toggleSort} />
              <SortableHead column="date" label="Date" sort={sort} onSort={toggleSort} />
              <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} />
              <SortableHead column="result" label="Result" sort={sort} onSort={toggleSort} />
              <SortableHead column="expiration" label="Expiration" sort={sort} onSort={toggleSort} />
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No blood tests found
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((test) => {
                const position = positions.get(test.enrolled_id);
                const name = test.enrolled?.person?.compiled_name ?? '';
                const fighterId = test.enrolled?.person?.appadmin_fighter_id;
                return (
                <TableRow key={test.id}>
                  <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                    <FightOrderCell order={position?.fightOrder} />
                  </TableCell>
                  <TableCell className="text-center p-2">
                    <div className="flex justify-center">
                      <FighterAvatar name={name} photoUrl={getFighterPhotoUrl(fighterId)} corner={position?.corner} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <FighterIdentity name={name} fighterId={fighterId} eventName={test.enrolled?.event_name} />
                  </TableCell>
                  <TableCell>{test.test_type}</TableCell>
                  <TableCell>
                    {test.scheduled_date ? format(new Date(test.scheduled_date + 'T00:00:00'), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[test.status]}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {test.result ? (
                      <Badge variant="outline" className={resultColors[test.result]}>
                        {test.result.charAt(0).toUpperCase() + test.result.slice(1)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {test.expiration_date ? (
                      <span className={new Date(test.expiration_date) < new Date() ? 'text-red-500 font-medium' : ''}>
                        {format(new Date(test.expiration_date + 'T00:00:00'), 'MMM dd, yyyy')}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(test)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateResult(test.id, 'clear')}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />Mark Clear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateResult(test.id, 'flagged')}>
                          <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />Mark Flagged
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateResult(test.id, 'failed')}>
                          <XCircle className="mr-2 h-4 w-4 text-red-600" />Mark Failed
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(test.id)}>
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
            <AlertDialogTitle>Delete Blood Test?</AlertDialogTitle>
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
