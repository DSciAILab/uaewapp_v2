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
import { Search, Plus, Trash2, Users, Printer, Loader2, Tags } from 'lucide-react';
import { EventTask } from '@/types/task';
import {
  TaskAssignment,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
  getTaskAssignments,
  createAssignments,
  updateAssignmentStatus,
  deleteAssignment,
  getUnassignedEnrollments,
  enrollAllFighters,
} from '@/lib/services/task-assignments';
import { getEventById } from '@/lib/services/events';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getDataUrl, getFighterPhotoUrl } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import {
  loadBrandLogo,
  repeatingHeader,
  drawReportFooters,
  buildReportFilename,
  drawAthleteCell,
  drawAthletePhoto,
  REPORT_TABLE_STYLES,
} from '@/lib/pdf/identity';
import { getWhereaboutsMap } from '@/lib/pdf/whereabouts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

/** Same colour language as the operations dashboard, so the two agree. */
const ASSIGNMENT_STATUS_TONE: Record<AssignmentStatus, string> = {
  pending: 'text-yellow-600 dark:text-yellow-400',
  in_progress: 'text-orange-600 dark:text-orange-400',
  completed: 'text-emerald-600 dark:text-emerald-400',
  exempt: 'text-muted-foreground',
  cancelled: 'text-muted-foreground line-through',
};

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
  const [isEnrollingAll, setIsEnrollingAll] = useState(false);
  const [availableEnrollments, setAvailableEnrollments] = useState<any[]>([]);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [assignRoleFilter, setAssignRoleFilter] = useState<'all' | 'fighters' | 'staff'>('all');
  const [assignCornerFilter, setAssignCornerFilter] = useState<'all' | 'RED' | 'BLUE'>('all');
  const [assignSearch, setAssignSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Same shape as assignCornerFilter above, but for the list you are looking at
  // rather than the Assign panel — the two are independent filters on two
  // different lists, and sharing one would make opening Assign silently
  // re-filter the table behind it.
  const [cornerFilter, setCornerFilter] = useState<'all' | 'RED' | 'BLUE'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });
  // Second line of the identity block is the EVENT — person.event_name is the
  // athlete's ring name, which is a different thing despite the column name.
  const [eventName, setEventName] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const { user } = useUser();

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

  useEffect(() => {
    if (!open || !eventId) return;
    let cancelled = false;
    getEventById(eventId)
      .then((e) => { if (!cancelled) setEventName(e?.name ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, eventId]);

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

  const handleEnrollAll = async () => {
    if (!task) return;
    try {
      setIsEnrollingAll(true);
      const added = await enrollAllFighters(eventId, task.id);
      toast.success(
        added
          ? `${added} fighter${added === 1 ? '' : 's'} enrolled as Requested`
          : 'Every fighter is already on this task'
      );
      if (added) loadAssignments();
    } catch {
      toast.error('Failed to enroll fighters');
    } finally {
      setIsEnrollingAll(false);
    }
  };

  const handleStatusUpdate = async (assignment: TaskAssignment, newStatus: AssignmentStatus) => {
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
      // Corner comes from the fight card, not the enrollment, so only people on
      // the card have one: picking RED or BLUE necessarily drops staff and
      // coaches, who have no corner to match. Same rule the Assign panel uses.
      if (cornerFilter !== 'all' && positionOf(a).corner !== cornerFilter) return false;
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
  }, [assignments, statusFilter, cornerFilter, searchQuery, sort, positionOf]);

  const toggleSort = (key: SortKey) => setSort(prev => nextSort(prev, key));

  // Cancelled rows stay on screen but leave the count: holding them in the
  // denominator would make the task look permanently unfinished (UAE-26).
  const stats = {
    total: assignments.filter(a => a.status !== 'cancelled').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    pending: assignments.filter(a => a.status === 'pending').length
  };

  /**
   * The task's own clipboard sheet, on the identity Medical and Fighter Stats
   * already use, so the three read as one system.
   *
   * Only people who still have to do the task are printed. 'exempt' never
   * needed it and 'cancelled' left the event, so neither will ever be filled
   * in: a row nobody writes on wastes the page and invites a wrong tick. The
   * screen keeps showing them — this is the printed form, not the record.
   */
  const printableAssignments = useMemo(
    () => filteredAssignments.filter((a) => a.status !== 'exempt' && a.status !== 'cancelled'),
    [filteredAssignments]
  );

  /**
   * Row height in mm for each version of the sheet.
   *
   * NORMAL is the clipboard sheet: tall enough for a pen. LABEL is the same
   * document with 4cm rows, so a printed sample label can be stuck beside the
   * athlete it belongs to — Blood Test needs to pair a tube label with a name,
   * and 15mm leaves nowhere to put it. Only the height changes: same columns,
   * same order, same filters, because the two sheets get read side by side and
   * any other difference would be a second thing to reconcile.
   */
  const ROW_MM = { normal: 15, label: 40 } as const;
  type SheetVariant = keyof typeof ROW_MM;

  const handlePrint = async (variant: SheetVariant = 'normal') => {
    if (!task) return;
    setPrinting(true);
    try {
      const ordered = printableAssignments;

      const [logoDataUrl, whereabouts, photoEntries] = await Promise.all([
        loadBrandLogo(),
        getWhereaboutsMap(eventId),
        Promise.all(
          ordered.map(async (a) => {
            const url = getFighterPhotoUrl(a.enrollment?.person.appadmin_fighter_id);
            if (!url) return [a.id, null] as const;
            try {
              return [a.id, await getDataUrl(url)] as const;
            } catch {
              return [a.id, null] as const;
            }
          })
        ),
      ]);
      const photoMap = new Map(photoEntries);

      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const done = ordered.filter((a) => a.status === 'completed').length;
      const headerOptions = {
        eventName: eventName || 'Event',
        documentTitle: task.name,
        printedBy: user?.name || user?.email,
        breakdown: `${ordered.length} people · ${done} done · ${ordered.length - done} open`,
        logoDataUrl,
      };

      // Columns are described rather than hardcoded because the two sheets do
      // not have the same ones: the label sheet drops 'Done'. With positional
      // arrays, removing a column silently shifts every index after it and the
      // photo starts being drawn into the name's cell.
      const isLabel = variant === 'label';
      const columns = [
        { key: 'order', label: '#', width: 10, halign: 'center' as const },
        // The tick box is for the clipboard. The label sheet has a label stuck
        // where it would go, and nobody ticks a sheet they are labelling.
        ...(isLabel ? [] : [{ key: 'done', label: 'Done', width: 14, halign: 'center' as const }]),
        // The photo grows 50% on the label sheet, so its column has to grow with
        // it — drawAthletePhoto clamps to the cell, so a wider circle in a 14mm
        // column would just be silently cropped back to 14mm.
        { key: 'photo', label: 'Photo', width: isLabel ? 20 : 14, halign: 'center' as const },
        { key: 'person', label: 'Person', width: 62 },
        { key: 'status', label: 'Status', width: 28 },
        { key: 'notes', label: 'Notes', width: 'auto' as const },
      ];
      const colIndex = (key: string) => columns.findIndex((c) => c.key === key);
      const iPhoto = colIndex('photo');
      const iPerson = colIndex('person');

      autoTable(doc, {
        ...repeatingHeader(doc, headerOptions),
        head: [columns.map((c) => c.label)],
        body: ordered.map((a) =>
          columns.map((c) => {
            switch (c.key) {
              case 'order': return String(positionOf(a).fightOrder ?? '-');
              // Open rows are blank to tick on paper. Rows already marked done
              // in the app carry the tick, otherwise the sheet shows a finished
              // person as outstanding and the staff redo work already recorded.
              case 'done': return a.status === 'completed' ? 'X' : '';
              // What the app says right now, so the clipboard and the record
              // can be compared without opening the app.
              case 'status': return ASSIGNMENT_STATUS_LABELS[a.status] || '';
              // photo and person are drawn by hand in didDrawCell; notes is
              // written on paper.
              default: return '';
            }
          })
        ),
        // Same taller rows as Fighter Stats: an empty cell has to fit a pen.
        // The label sheet goes to 4cm so a sample label fits beside the row.
        styles: { ...REPORT_TABLE_STYLES.styles, valign: 'middle', minCellHeight: ROW_MM[variant] },
        // A row split across a page break has nowhere to stick a label. By
        // default autoTable happily cuts one in half — measured on 26 athletes
        // at 4cm, four rows came out as 28.78+11.22 and 17.56+22.44mm. 'avoid'
        // pushes the whole row to the next page instead: 26 rows of exactly
        // 40mm over 6 pages rather than 5 pages with four unusable rows.
        rowPageBreak: 'avoid',
        headStyles: REPORT_TABLE_STYLES.headStyles,
        columnStyles: Object.fromEntries(
          columns.map((c, i) => [
            i,
            { cellWidth: c.width, ...(c.halign ? { halign: c.halign } : {}) },
          ])
        ),
        didParseCell: (data) => {
          if (data.section === 'body' && data.cell.text.join('') === '') data.cell.text = [''];
        },
        didDrawCell: (data) => {
          if (data.section !== 'body') return;
          const a = ordered[data.row.index];
          if (!a) return;
          try {
            if (data.column.index === iPhoto) {
              drawAthletePhoto(doc, data.cell, {
                dataUrl: photoMap.get(a.id),
                corner: positionOf(a).corner,
                // 50% up from the 11mm the normal sheet prints, stated as a
                // measurement so widening the column cannot change it again.
                sizeMm: isLabel ? 16.5 : undefined,
              });
            } else if (data.column.index === iPerson) {
              drawAthleteCell(doc, data.cell, {
                name: a.enrollment?.person.event_name || a.enrollment?.person.compiled_name || '',
                eventCode: a.enrollment?.event_code ?? null,
                detail: whereabouts.get(a.enrollment_id),
                // Name and room read from a distance on the label sheet, and
                // centred so they sit beside the label rather than above it.
                nameFontSize: isLabel ? 10 : 8,
                verticalAlign: isLabel ? 'middle' : 'top',
              });
            }
          } catch (err) {
            console.warn('[task sheet pdf] cell draw failed:', err);
          }
        },
      });

      drawReportFooters(doc, `${eventName || 'Event'} — ${task.name}`);
      // The two sheets are printed in the same session and land in the same
      // downloads folder, so the label version has to say so in its name —
      // otherwise the second one arrives as "…(1).pdf" and nobody knows which
      // is which without opening both.
      doc.save(
        buildReportFilename(
          eventName || 'Event',
          variant === 'label' ? `${task.name} labels` : task.name
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to build the PDF');
    } finally {
      setPrinting(false);
    }
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
              {(Object.keys(ASSIGNMENT_STATUS_LABELS) as AssignmentStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{ASSIGNMENT_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cornerFilter} onValueChange={(v) => setCornerFilter(v as typeof cornerFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Corner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Athletes</SelectItem>
              <SelectItem value="RED">Red Corner</SelectItem>
              <SelectItem value="BLUE">Blue Corner</SelectItem>
            </SelectContent>
          </Select>
          {/*
            The intended first move on any task: put every fighter on it, then
            mark the exceptions 'Not required'. Nobody gets left off by omission.
          */}
          <Button variant="outline" onClick={handleEnrollAll} disabled={isEnrollingAll}>
            <Users className="h-4 w-4 mr-2" /> {isEnrollingAll ? 'Enrolling…' : 'Enroll all fighters'}
          </Button>
          {/* Disabled when nothing is printable, so the button never hands out a blank sheet. */}
          <Button variant="outline" onClick={() => handlePrint('normal')} disabled={printing || printableAssignments.length === 0}>
            {printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Print
          </Button>
          {/* Same sheet with 4cm rows, to stick a label beside each athlete. */}
          <Button variant="outline" onClick={() => handlePrint('label')} disabled={printing || printableAssignments.length === 0}>
            {printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tags className="h-4 w-4 mr-2" />}
            Labels
          </Button>
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
                        eventName={eventName}
                      />
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{assignment.enrollment?.role.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {/*
                        Four states, not a Done toggle: 'Not required' is how the
                        staff records a deliberate exception, and without it an
                        exempt athlete stays "Requested" forever and reads as a
                        pending job nobody is doing.
                      */}
                      <Select
                        value={assignment.status}
                        onValueChange={(v) => handleStatusUpdate(assignment, v as AssignmentStatus)}
                      >
                        <SelectTrigger className={`h-8 w-[150px] text-xs ${ASSIGNMENT_STATUS_TONE[assignment.status] || ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ASSIGNMENT_STATUS_LABELS) as AssignmentStatus[]).map((s) => (
                            <SelectItem key={s} value={s} className={ASSIGNMENT_STATUS_TONE[s]}>
                              {ASSIGNMENT_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
