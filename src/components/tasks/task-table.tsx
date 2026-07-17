'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Play, CheckCircle, XCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { EventTask, TaskStatus, TASK_CATEGORY_LABELS } from '@/types/task';
import { TaskStatusBadge, TaskPriorityBadge } from './task-status-badge';
import { deleteEventTask, updateTaskStatus } from '@/lib/services/task-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TaskAssignmentsSheet } from './task-assignments-sheet';
import { useParams } from 'next/navigation';

interface TaskTableProps {
  tasks: EventTask[];
  onEdit: (task: EventTask) => void;
  onRefresh: () => void;
}

export function TaskTable({ tasks, onEdit, onRefresh }: TaskTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignmentTask, setAssignmentTask] = useState<EventTask | null>(null);
  const params = useParams();
  const eventId = params.eventId as string;

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteEventTask(deleteId);
      toast.success('Task deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, status);
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
              <TableHead>Task</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Checklist</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const completedItems = task.checklist_items.filter(i => i.completed).length;
                const totalItems = task.checklist_items.length;
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

                return (
                  <TableRow key={task.id} className={isOverdue ? 'bg-red-50' : ''}>
                    <TableCell>
                      <div 
                        className="cursor-pointer hover:underline" 
                        onClick={() => setAssignmentTask(task)}
                      >
                        <p className="font-medium">{task.name}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TASK_CATEGORY_LABELS[task.category]}</Badge>
                    </TableCell>
                    <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                    <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <div className={isOverdue ? 'text-red-600' : ''}>
                          {/* A start date only earns its own line when it differs —
                              "Jul 19 → Jul 19" is noise, not a range. */}
                          <p>
                            {task.start_date && task.start_date !== task.due_date
                              ? `${format(new Date(task.start_date + 'T00:00:00'), 'MMM dd')} → ${format(
                                  new Date(task.due_date + 'T00:00:00'),
                                  'MMM dd'
                                )}`
                              : format(new Date(task.due_date + 'T00:00:00'), 'MMM dd')}
                          </p>
                          {task.due_time && <p className="text-sm">{task.due_time}</p>}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {totalItems > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${(completedItems / totalItems) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">{completedItems}/{totalItems}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(task)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {task.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                              <Play className="mr-2 h-4 w-4" />Start
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}>
                              <CheckCircle className="mr-2 h-4 w-4" />Complete
                            </DropdownMenuItem>
                          )}
                          {task.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'cancelled')}>
                              <XCircle className="mr-2 h-4 w-4" />Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(task.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setAssignmentTask(task)}>
                              <Users className="mr-2 h-4 w-4" />Manage People
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

      <TaskAssignmentsSheet 
        task={assignmentTask} 
        open={!!assignmentTask} 
        onOpenChange={(open) => !open && setAssignmentTask(null)}
        eventId={eventId}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
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
