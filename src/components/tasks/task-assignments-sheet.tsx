'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';
import { EventTask } from '@/types/task';
import { TaskAssignment, getTaskAssignments, createAssignments, updateAssignmentStatus, deleteAssignment, getUnassignedEnrollments } from '@/lib/services/task-assignments';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFighterPhotoUrl } from '@/lib/utils';

interface TaskAssignmentsSheetProps {
  task: EventTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function TaskAssignmentsSheet({ task, open, onOpenChange, eventId }: TaskAssignmentsSheetProps) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [availableEnrollments, setAvailableEnrollments] = useState<any[]>([]);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load assignments when sheet opens
  const loadAssignments = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const data = await getTaskAssignments(task.id);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (open && task) {
      loadAssignments();
    }
  }, [open, task, loadAssignments]);

  // Load available people for dialog
  const loadAvailable = async () => {
    if (!task) return;
    try {
      const data = await getUnassignedEnrollments(eventId, task.id);
      setAvailableEnrollments(data);
    } catch (error) {
      toast.error('Failed to load available people');
    }
  };

  const handleOpenAssignDialog = () => {
    loadAvailable();
    setSelectedEnrollments([]);
    setIsAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!task || selectedEnrollments.length === 0) return;
    try {
      await createAssignments(task.id, selectedEnrollments);
      toast.success(`${selectedEnrollments.length} people assigned`);
      setIsAssignDialogOpen(false);
      loadAssignments();
    } catch (error) {
      toast.error('Failed to assign people');
    }
  };

  const handleStatusUpdate = async (assignment: TaskAssignment, newStatus: 'pending' | 'completed') => {
    try {
      await updateAssignmentStatus(assignment.id, newStatus);
      // Optimistic update
      setAssignments(prev => prev.map(a => 
        a.id === assignment.id ? { ...a, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null } : a
      ));
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
      loadAssignments(); // Revert on error
    }
  };

  const handleNotesUpdate = async (assignment: TaskAssignment, notes: string) => {
    try {
        await updateAssignmentStatus(assignment.id, assignment.status, notes);
        toast.success('Notes updated');
    } catch (error) {
        toast.error('Failed to save notes');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this person from the task?')) return;
    try {
      await deleteAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      toast.success('Assignment removed');
    } catch (error) {
      toast.error('Failed to remove assignment');
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery) {
      const name = a.enrollment?.person.full_name?.toLowerCase() || '';
      const role = a.enrollment?.role.name?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      return name.includes(query) || role.includes(query);
    }
    return true;
  });

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    pending: assignments.filter(a => a.status === 'pending').length
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] flex flex-col h-full bg-background" side="right">
        <SheetHeader className="mb-4">
          <div className="flex justify-between items-start mr-8">
            <div>
              <SheetTitle>Task Assignments: {task?.name}</SheetTitle>
              <SheetDescription>{task?.description || 'Manage people assigned to this task'}</SheetDescription>
            </div>
            <div className="flex gap-2">
                <Badge variant="outline">{stats.completed}/{stats.total} Completed</Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search people..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleOpenAssignDialog}>
            <Plus className="h-4 w-4 mr-2" /> Assign
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed Date</TableHead>
                <TableHead className="w-[200px]">Notes</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredAssignments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assignments found</TableCell></TableRow>
              ) : (
                filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {assignment.enrollment?.person.fighter_id && (
                            <AvatarImage src={getFighterPhotoUrl(assignment.enrollment.person.fighter_id)} />
                          )}
                          <AvatarFallback className="text-[10px]">
                            {assignment.enrollment?.person.name?.[0]}{assignment.enrollment?.person.surname?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {assignment.enrollment?.person.full_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{assignment.enrollment?.role.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                          {assignment.status === 'completed' ? (
                              <Button 
                                  size="sm" variant="ghost" 
                                  className="text-green-600 hover:text-green-700 h-8 px-2"
                                  onClick={() => handleStatusUpdate(assignment, 'pending')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Done
                              </Button>
                          ) : (
                              <Button 
                                  size="sm" variant="ghost" 
                                  className="text-muted-foreground hover:text-primary h-8 px-2"
                                  onClick={() => handleStatusUpdate(assignment, 'completed')}
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  Pending
                              </Button>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {assignment.completed_at ? format(new Date(assignment.completed_at), 'MMM dd, HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                        <Input 
                            className="h-8 text-xs" 
                            placeholder="Add note..." 
                            defaultValue={assignment.notes || ''}
                            onBlur={(e) => {
                                if (e.target.value !== assignment.notes) {
                                    handleNotesUpdate(assignment, e.target.value);
                                }
                            }}
                        />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(assignment.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Assign Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Assign People to Task</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto py-4">
                     {availableEnrollments.length === 0 ? (
                        <div className="text-center text-muted-foreground">No available people to assign.</div>
                     ) : (
                        <div className="space-y-2">
                            {availableEnrollments.map(enrollment => (
                                <div key={enrollment.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded border">
                                    <Checkbox 
                                        id={enrollment.id} 
                                        checked={selectedEnrollments.includes(enrollment.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setSelectedEnrollments(prev => [...prev, enrollment.id]);
                                            else setSelectedEnrollments(prev => prev.filter(id => id !== enrollment.id));
                                        }}
                                    />
                                    <label htmlFor={enrollment.id} className="flex-1 cursor-pointer flex items-center gap-3 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        <Avatar className="h-6 w-6">
                                          {enrollment.person?.fighter_id && (
                                            <AvatarImage src={getFighterPhotoUrl(enrollment.person.fighter_id)} />
                                          )}
                                          <AvatarFallback className="text-[8px]">
                                            {enrollment.person?.name?.[0]}{enrollment.person?.surname?.[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span>{enrollment.person.compiled_name || enrollment.person.name}</span>
                                          <span className="text-[10px] text-muted-foreground">{enrollment.role.name}</span>
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
                <DialogFooter className="pt-4 border-t">
                    <div className="flex justify-between w-full items-center">
                        <span className="text-sm text-muted-foreground">{selectedEnrollments.length} selected</span>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                             <Button onClick={handleAssign} disabled={selectedEnrollments.length === 0}>Assign Selected</Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </SheetContent>
    </Sheet>
  );
}
