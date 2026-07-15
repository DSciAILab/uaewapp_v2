'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { BloodTest, BloodTestStatus, BloodTestResult } from '@/types/pre-event';
import { deleteBloodTest, updateBloodTestResult } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BloodTestTableProps {
  bloodTests: BloodTest[];
  onEdit: (test: BloodTest) => void;
  onRefresh: () => void;
}

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
              <TableHead>Participant</TableHead>
              <TableHead>Test Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bloodTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No blood tests found
                </TableCell>
              </TableRow>
            ) : (
              bloodTests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.enrolled?.person?.compiled_name}</TableCell>
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
              ))
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
