'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getFighterPhotoUrl } from '@/lib/utils';
import {
  FighterAvatar,
  FighterIdentity,
  FightOrderCell,
  FIGHT_ORDER_CELL_CLASS,
  FIGHT_ORDER_HEAD_CLASS,
  SortableHead,
  nextSort,
  compareValues,
  type SortState,
} from '@/components/fighters/fighter-identity';
import { getFightCardPositions, NO_POSITION, type FightCardPosition } from '@/lib/services/fight-card-positions';

type SortKey = 'order' | 'corner' | 'person' | 'role' | 'status' | 'completed' | 'notes';

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
  const [assignRoleFilter, setAssignRoleFilter] = useState<'all' | 'fighters' | 'staff'>('all');
  const [assignCornerFilter, setAssignCornerFilter] = useState<'all' | 'RED' | 'BLUE'>('all');
  const [assignSearch, setAssignSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });

  // Load assignments when sheet opens
  const loadAssignments = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    try {
      const data = await getTaskAssignments(task.id);
      setAssignments(data);

      // Corners/bout order aren't on the enrollment — resolve them from the card.
      const people = data
        .filter((a) => a.enrollment)
        .map((a) => ({
          enrollmentId: a.enrollment_id,
          fullName: a.enrollment!.person.compiled_name || '',
          ringName: a.enrollment!.person.event_name,
        }));
      setPositions(await getFightCardPositions(eventId, people));
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [task, eventId]);

  useEffect(() => {
    if (open && task) {
      loadAssignments();
    }
  }, [open, task, loadAssignments]);

  // Load available people for dialog
  const loadAvailable = async () => {
    if (!task) return;
    setAssignSearch('');
    setAssignRoleFilter('all');
    setAssignCornerFilter('all');
    try {
      const data = await getUnassignedEnrollments(eventId, task.id);
      // Candidates carry no corner of their own; the card does. Resolve it for
      // this list too, otherwise the corner filter has nothing to read.
      const candidatePositions = await getFightCardPositions(
        eventId,
        data.map((e: { id: string; person?: { compiled_name?: string; event_name?: string } }) => ({
          enrollmentId: e.id,
          fullName: e.person?.compiled_name || '',
          ringName: e.person?.event_name ?? null,
        }))
      );
      setPositions((prev) => new Map([...prev, ...candidatePositions]));
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

  const positionOf = useCallback(
    (a: TaskAssignment) => positions.get(a.enrollment_id) ?? NO_POSITION,
    [positions]
  );

  const filteredAssignments = useMemo(() => {
    const filtered = assignments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchQuery) {
        const name = a.enrollment?.person.compiled_name?.toLowerCase() || '';
        const role = a.enrollment?.role.name?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return name.includes(query) || role.includes(query);
      }
      return true;
    });

    const valueOf = (a: TaskAssignment): unknown => {
      switch (sort.key) {
        case 'order': return positionOf(a).fightOrder;
        case 'corner': return positionOf(a).corner;
        case 'person': return a.enrollment?.person.compiled_name;
        case 'role': return a.enrollment?.role.name;
        case 'status': return a.status;
        case 'completed': return a.completed_at;
        case 'notes': return a.notes;
        default: return null;
      }
    };

    const sorted = [...filtered].sort((a, b) => compareValues(valueOf(a), valueOf(b)));
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  }, [assignments, statusFilter, searchQuery, sort, positionOf]);

  const toggleSort = (key: SortKey) => setSort(prev => nextSort(prev, key));

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    pending: assignments.filter(a => a.status === 'pending').length
  };

  // Corner only exists for people on the card, so filtering by it implies
  // fighters — a staffer has no corner to match.
  const assignCandidates = useMemo(() => {
    const term = assignSearch.trim().toLowerCase();
    return availableEnrollments.filter((e) => {
      const roleCode = e.role?.code;
      if (assignRoleFilter === 'fighters' && roleCode !== 'F') return false;
      if (assignRoleFilter === 'staff' && roleCode === 'F') return false;

      if (assignCornerFilter !== 'all') {
        if ((positions.get(e.id)?.corner ?? null) !== assignCornerFilter) return false;
      }

      if (term) {
        const name = (e.person?.compiled_name || e.person?.name || '').toLowerCase();
        const fid = (e.person?.appadmin_fighter_id || '').toLowerCase();
        if (!name.includes(term) && !fid.includes(term)) return false;
      }
      return true;
    });
  }, [availableEnrollments, assignRoleFilter, assignCornerFilter, assignSearch, positions]);

  const allCandidatesSelected =
    assignCandidates.length > 0 && assignCandidates.every((e) => selectedEnrollments.includes(e.id));

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
                <SortableHead column="order" label="#" sort={sort} onSort={toggleSort} className={FIGHT_ORDER_HEAD_CLASS} center />
                <SortableHead column="corner" label="Photo" sort={sort} onSort={toggleSort} className="w-[80px] text-center" center />
                <SortableHead column="person" label="Fighter" sort={sort} onSort={toggleSort} className="w-[240px]" />
                <SortableHead column="role" label="Role" sort={sort} onSort={toggleSort} />
                <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} />
                <SortableHead column="completed" label="Completed Date" sort={sort} onSort={toggleSort} />
                <SortableHead column="notes" label="Notes" sort={sort} onSort={toggleSort} className="w-[200px]" />
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredAssignments.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assignments found</TableCell></TableRow>
              ) : (
                filteredAssignments.map((assignment) => {
                  const person = assignment.enrollment?.person;
                  const position = positionOf(assignment);
                  const name = person?.compiled_name || '';
                  return (
                  <TableRow key={assignment.id}>
                    <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                      <FightOrderCell order={position.fightOrder} />
                    </TableCell>

                    <TableCell className="text-center p-2">
                      <div className="flex justify-center">
                        <FighterAvatar
                          name={name}
                          photoUrl={getFighterPhotoUrl(person?.appadmin_fighter_id)}
                          corner={position.corner}
                        />
                      </div>
                    </TableCell>

                    <TableCell>
                      <FighterIdentity
                        name={name}
                        fighterId={person?.appadmin_fighter_id ? String(person.appadmin_fighter_id) : null}
                        eventName={person?.event_name}
                      />
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
                  );
                })
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
                {/* Filters */}
                <div className="space-y-2 border-b pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search name or fighter ID..."
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      className="h-8 pl-9 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={assignRoleFilter}
                      onValueChange={(v) => {
                        const role = v as 'all' | 'fighters' | 'staff';
                        setAssignRoleFilter(role);
                        // Staff have no corner; leaving a corner set would show an
                        // empty list and look like a bug.
                        if (role === 'staff') setAssignCornerFilter('all');
                      }}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="fighters">Fighters only</SelectItem>
                        <SelectItem value="staff">Staff only</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={assignCornerFilter}
                      onValueChange={(v) => {
                        const corner = v as 'all' | 'RED' | 'BLUE';
                        setAssignCornerFilter(corner);
                        // Picking a corner is asking for fighters.
                        if (corner !== 'all' && assignRoleFilter !== 'fighters') setAssignRoleFilter('fighters');
                      }}
                      disabled={assignRoleFilter === 'staff'}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All corners</SelectItem>
                        <SelectItem value="RED">Red corner</SelectItem>
                        <SelectItem value="BLUE">Blue corner</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs ml-auto"
                      disabled={assignCandidates.length === 0}
                      onClick={() => {
                        const ids = assignCandidates.map((e) => e.id);
                        setSelectedEnrollments((prev) =>
                          allCandidatesSelected
                            ? prev.filter((id) => !ids.includes(id))
                            : Array.from(new Set([...prev, ...ids]))
                        );
                      }}
                    >
                      {allCandidatesSelected ? 'Clear' : `Select all (${assignCandidates.length})`}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto py-4">
                     {assignCandidates.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          {availableEnrollments.length === 0
                            ? 'No available people to assign.'
                            : 'Nobody matches these filters.'}
                        </div>
                     ) : (
                        <div className="space-y-2">
                            {assignCandidates.map(enrollment => (
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
                                        <FighterAvatar
                                          name={enrollment.person?.compiled_name || enrollment.person?.name || ''}
                                          photoUrl={getFighterPhotoUrl(enrollment.person?.appadmin_fighter_id)}
                                          corner={positions.get(enrollment.id)?.corner}
                                          className="h-8 w-8 border-2"
                                        />
                                        <div className="flex flex-col min-w-0">
                                          <span className="truncate">
                                            {enrollment.person.compiled_name || enrollment.person.name}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {enrollment.role.name}
                                            {positions.get(enrollment.id)?.fightOrder != null &&
                                              ` · Fight ${positions.get(enrollment.id)!.fightOrder}`}
                                          </span>
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
