'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { RequiredDocument, DocumentStatus } from '@/types/pre-event';
import { deleteDocument, updateDocumentStatus } from '@/lib/services/pre-event-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DocumentsTableProps {
  documents: RequiredDocument[];
  onEdit: (doc: RequiredDocument) => void;
  onRefresh: () => void;
}

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
              <TableHead>Participant</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Document Name</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.enrolled?.person?.compiled_name}</TableCell>
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
              ))
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
