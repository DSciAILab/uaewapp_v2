'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { MedicalExam, MedicalExamStatus } from '@/types/pre-event';
import { deleteMedicalExam, updateMedicalExam } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MedicalExamTableProps {
  medicalExams: MedicalExam[];
  onEdit: (exam: MedicalExam) => void;
  onRefresh: () => void;
}

const statusColors: Record<MedicalExamStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

export function MedicalExamTable({ medicalExams, onEdit, onRefresh }: MedicalExamTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
              <TableHead>Participant</TableHead>
              <TableHead>Exam Type</TableHead>
              <TableHead>Examiner</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicalExams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No medical exams found
                </TableCell>
              </TableRow>
            ) : (
              medicalExams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.enrolled?.person?.full_name}</TableCell>
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
              ))
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
