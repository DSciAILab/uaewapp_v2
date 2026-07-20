'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  SortableHead,
  nextSort,
  compareValues,
  type SortState,
} from '@/components/fighters/fighter-identity';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Play, CheckCircle, XCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { EventTask, TaskStatus, TaskPriority, TASK_CATEGORY_LABELS } from '@/types/task';
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

type SortKey = 'name' | 'category' | 'priority' | 'status' | 'due' | 'checklist';

/** Urgency, not the alphabet — sorting by priority to get "high, low, medium,
 *  urgent" would be worse than not sorting at all. */
const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
};

/** The order work actually moves through, so one click groups what still needs
 *  doing at the top and the finished and dropped work at the bottom. */
const STATUS_RANK: Record<TaskStatus, number> = {
  in_progress: 0, pending: 1, completed: 2, cancelled: 3,
};

/**
 * The value a column sorts on, which is not always the value it displays.
 * Checklist shows "3/7" but sorts on how much is left undone, because a bar at
 * 3/7 and one at 30/70 are the same progress and reading them as text is not.
 */
function sortValue(task: EventTask, key: SortKey | null): string | number | null {
  switch (key) {
    case 'name': return task.name;
    case 'category': return TASK_CATEGORY_LABELS[task.category];
    case 'priority': return PRIORITY_RANK[task.priority];
    case 'status': return STATUS_RANK[task.status];
    // Sort on the raw ISO date, never the "MMM dd" on screen: formatted dates
    // sort alphabetically, which puts April before January.
    case 'due': return task.due_date ? `${task.due_date}T${task.due_time || '00:00'}` : null;
    case 'checklist': {
      const total = task.checklist_items.length;
      if (!total) return null;
      return task.checklist_items.filter(i => i.completed).length / total;
    }
    default: return null;
  }
}

export function TaskTable({ tasks, onEdit, onRefresh }: TaskTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignmentTask, setAssignmentTask] = useState<EventTask | null>(null);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'due', dir: 'asc' });
  const params = useParams();
  const eventId = params.eventId as string;

  const toggleSort = (key: SortKey) => setSort(prev => nextSort(prev, key));

  // Sort a COPY: Array.prototype.sort mutates, and `tasks` is the parent's
  // state — reordering it in place makes the parent disagree with the screen.
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => {
      const cmp = compareValues(sortValue(a, sort.key), sortValue(b, sort.key));
      return sort.dir === 'asc' ? cmp : -cmp;
    }),
    [tasks, sort]
  );

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
              <SortableHead column="name" label="Task" sort={sort} onSort={toggleSort} />
              <SortableHead column="category" label="Category" sort={sort} onSort={toggleSort} />
              <SortableHead column="priority" label="Priority" sort={sort} onSort={toggleSort} />
              <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} />
              <SortableHead column="due" label="Due" sort={sort} onSort={toggleSort} />
              <SortableHead column="checklist" label="Checklist" sort={sort} onSort={toggleSort} />
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
              sortedTasks.map((task) => {
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
