'use client';

import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { MedicalExamStatus } from '@/types/pre-event';
import { MedicalExamRow, deleteMedicalExam, updateMedicalExam } from '@/lib/services/pre-event-service';
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

interface MedicalExamTableProps {
  medicalExams: MedicalExamRow[];
  onEdit: (exam: MedicalExamRow) => void;
  onRefresh: () => void;
}

type SortKey = 'order' | 'athlete' | 'exam_type' | 'examiner' | 'date' | 'status' | 'result';

const statusColors: Record<MedicalExamStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

export function MedicalExamTable({ medicalExams, onEdit, onRefresh }: MedicalExamTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());

  // Every row here belongs to the same event, so the id rides along with the
  // data instead of being threaded through the page as one more prop.
  const eventId = medicalExams[0]?.event_id ?? '';

  // One entry per athlete: a fighter can have several exams, and the CSV
  // fallback should be asked about each person once.
  const people = useMemo<EnrollmentIdentity[]>(() => {
    const byEnrollment = new Map<string, EnrollmentIdentity>();
    for (const exam of medicalExams) {
      if (byEnrollment.has(exam.enrolled_id)) continue;
      byEnrollment.set(exam.enrolled_id, {
        enrollmentId: exam.enrolled_id,
        fullName: exam.enrolled?.person?.compiled_name ?? '',
        ringName: exam.enrolled?.person?.ring_name ?? null,
      });
    }
    return [...byEnrollment.values()];
  }, [medicalExams]);

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
    const valueOf = (exam: MedicalExamRow): unknown => {
      switch (sort.key) {
        case 'order':
          return positions.get(exam.enrolled_id)?.fightOrder ?? null;
        case 'athlete':
          return exam.enrolled?.person?.compiled_name ?? '';
        case 'exam_type':
          return exam.exam_type;
        case 'examiner':
          return exam.examiner_name;
        case 'date':
          return exam.scheduled_date;
        case 'status':
          return exam.status;
        case 'result':
          // null (not yet examined) sinks below passed/failed.
          return exam.passed === null ? null : exam.passed ? 'Passed' : 'Failed';
        default:
          return null;
      }
    };
    const out = [...medicalExams].sort((a, b) => compareValues(valueOf(a), valueOf(b)));
    return sort.dir === 'asc' ? out : out.reverse();
  }, [medicalExams, sort, positions]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteMedicalExam(deleteId);
      toast.success('Medical exam deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete medical exam');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleMarkPassed = async (examId: string, passed: boolean) => {
    try {
      await updateMedicalExam(examId, { passed, status: 'completed' });
      toast.success(`Marked as ${passed ? 'passed' : 'failed'}`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update exam');
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
              <SortableHead column="exam_type" label="Exam Type" sort={sort} onSort={toggleSort} />
              <SortableHead column="examiner" label="Examiner" sort={sort} onSort={toggleSort} />
              <SortableHead column="date" label="Date" sort={sort} onSort={toggleSort} />
              <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} />
              <SortableHead column="result" label="Result" sort={sort} onSort={toggleSort} />
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No medical exams found
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((exam) => {
                const position = positions.get(exam.enrolled_id);
                const name = exam.enrolled?.person?.compiled_name ?? '';
                const fighterId = exam.enrolled?.person?.appadmin_fighter_id;
                return (
                <TableRow key={exam.id}>
                  <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                    <FightOrderCell order={position?.fightOrder} />
                  </TableCell>
                  <TableCell className="text-center p-2">
                    <div className="flex justify-center">
                      <FighterAvatar name={name} photoUrl={getFighterPhotoUrl(fighterId)} corner={position?.corner} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <FighterIdentity name={name} fighterId={fighterId} eventName={exam.enrolled?.event_name} />
                  </TableCell>
                  <TableCell>{exam.exam_type}</TableCell>
                  <TableCell>{exam.examiner_name || '-'}</TableCell>
                  <TableCell>
                    {exam.scheduled_date ? format(new Date(exam.scheduled_date + 'T00:00:00'), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[exam.status]}>
                      {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {exam.passed !== null ? (
                      <Badge variant="outline" className={exam.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {exam.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(exam)}>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleMarkPassed(exam.id, true)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />Mark Passed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMarkPassed(exam.id, false)}>
                          <XCircle className="mr-2 h-4 w-4 text-red-600" />Mark Failed
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(exam.id)}>
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
            <AlertDialogTitle>Delete Medical Exam?</AlertDialogTitle>
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
