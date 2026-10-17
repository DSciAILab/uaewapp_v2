'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Search, Plus, Trash2, Users, Printer, Loader2, Tags, List, LayoutGrid, MessageCircle, ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EventTask } from '@/types/task';
import {
  TaskAssignment,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
  getTaskAssignments,
  updateAssignmentStatus,
  deleteAssignment,
  enrollAllFighters,
} from '@/lib/services/task-assignments';
import { getEventById } from '@/lib/services/events';
import { getFightCardPositions, NO_POSITION, type FightCardPosition } from '@/lib/services/fight-card-positions';
import { printTaskAssignmentsSheet, type TaskSheetVariant } from '@/lib/pdf/task-assignments-pdf';
import { getFighterPhotoUrl, cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
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
import { CornerSummary, type CornerSummaryTotals, type PanelTotals, type SummaryBucket } from '@/components/shared/corner-summary';
import { AssignPeopleDialog } from './assign-people-dialog';

/**
 * A Pre Event Task (Blood Test, Photoshoot, Black Screen Video, Video
 * Shooting, or any task opened from the Tasks table) as a full page in the
 * Walk-out Songs layout (UAE-98). Rendered by /events/[eventId]/tasks when the
 * URL carries ?task=, so sidebar links and deep links keep working.
 *
 * Data goes through lib/services/task-assignments exactly as the old sheet did
 * (same logged-in browser client, same calls): no new query, no new table.
 * No Log column in v1 — there is no change history for task assignments.
 */

type SortKey = 'order' | 'corner' | 'person' | 'role' | 'status' | 'completed' | 'notes';

type AthleteView = 'list' | 'card';

/** Same key as the UAE-93 sheet toggle, so the user's saved choice carries over. */
const VIEW_STORAGE_KEY = 'uaew-task-sheet-view';

/**
 * Phones and tablets open in cards, desktops in the table (UAE-93). Width
 * alone would call a narrow desktop window a phone, and a tablet in landscape
 * a desktop — the pointer settles both: a finger wants cards.
 */
const CARD_DEVICE_QUERY = '(max-width: 639px), (pointer: coarse)';

const VIEWS: { key: AthleteView; Icon: typeof List; title: string }[] = [
  { key: 'list', Icon: List, title: 'List view' },
  { key: 'card', Icon: LayoutGrid, title: 'Card view' },
];

const CORNER_BADGE_CLASS: Record<'RED' | 'BLUE', string> = {
  RED: 'border-red-500/60 text-red-600 dark:text-red-400',
  BLUE: 'border-blue-500/60 text-blue-600 dark:text-blue-400',
};

/** Same colour language as the operations dashboard, so the two agree. */
const ASSIGNMENT_STATUS_TONE: Record<AssignmentStatus, string> = {
  pending: 'text-yellow-600 dark:text-yellow-400',
  in_progress: 'text-orange-600 dark:text-orange-400',
  completed: 'text-emerald-600 dark:text-emerald-400',
  exempt: 'text-muted-foreground',
  cancelled: 'text-muted-foreground line-through',
};

type TaskBucket = 'pending' | 'in_progress' | 'completed';

/**
 * What the corner panels count. 'Not required' and 'Cancelled' stay out, the
 * same rule as the progress count: neither is work anybody still has to do.
 */
const TASK_BUCKETS: SummaryBucket<TaskBucket>[] = [
  { key: 'pending', label: ASSIGNMENT_STATUS_LABELS.pending, tone: ASSIGNMENT_STATUS_TONE.pending },
  { key: 'in_progress', label: ASSIGNMENT_STATUS_LABELS.in_progress, tone: ASSIGNMENT_STATUS_TONE.in_progress },
  { key: 'completed', label: ASSIGNMENT_STATUS_LABELS.completed, tone: ASSIGNMENT_STATUS_TONE.completed },
];

/**
 * Blood Test is the only task that pairs a printed tube label with a name, so
 * it is the only one that offers the 4cm sheet (Fernando, 2026-07-20).
 */
function offersLabelSheet(task: EventTask): boolean {
  return (task.name || '').trim().toLowerCase() === 'blood test';
}

/**
 * The WhatsApp column keeps its place from /music, but no message exists for
 * these tasks yet — the text has to come from Fernando, so nothing is sent.
 */
function WhatsAppPlaceholder() {
  return (
    <span
      role="img"
      aria-label="WhatsApp message for this task not defined yet"
      title="WhatsApp message for this task not defined yet"
      className="inline-flex h-8 w-8 items-center justify-center cursor-not-allowed opacity-40"
    >
      <MessageCircle className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}

interface TaskAssignmentsPageProps {
  task: EventTask;
  eventId: string;
}

export function TaskAssignmentsPage({ task, eventId }: TaskAssignmentsPageProps) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isEnrollingAll, setIsEnrollingAll] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cornerFilter, setCornerFilter] = useState<'all' | 'RED' | 'BLUE'>('all');
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });
  const { user } = useUser();

  // List or cards: a saved choice wins, otherwise the device decides. Read
  // after mount: reading localStorage during render makes the server and the
  // first client render disagree.
  const [view, setView] = useState<AthleteView>('list');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'list' || saved === 'card') {
        setView(saved);
        return;
      }
    } catch {
      // Fall through to the device default.
    }
    if (window.matchMedia(CARD_DEVICE_QUERY).matches) setView('card');
  }, []);

  const changeView = (next: AthleteView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Forgetting the choice is not a reason to refuse it.
    }
  };

  const fetchRows = useCallback(async () => {
    const data = await getTaskAssignments(task.id);
    // Corners/bout order aren't on the enrollment — resolve them from the card.
    const people = data
      .filter((a) => a.enrollment)
      .map((a) => ({
        enrollmentId: a.enrollment_id,
        fullName: a.enrollment!.person.compiled_name || '',
        ringName: a.enrollment!.person.event_name,
      }));
    const resolved = await getFightCardPositions(eventId, people);
    return { data, resolved };
  }, [task.id, eventId]);

  const reload = useCallback(async () => {
    try {
      const { data, resolved } = await fetchRows();
      setAssignments(data);
      setPositions(resolved);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Failed to load assignments');
    }
  }, [fetchRows]);

  // Swapping the task in place (sidebar click while open) must not let the
  // previous task's filters or a slow response bleed into the next one.
  useEffect(() => {
    let stale = false;
    setAssignments([]);
    setPositions(new Map());
    setStatusFilter('all');
    setCornerFilter('all');
    setSearch('');
    setLoading(true);
    fetchRows()
      .then(({ data, resolved }) => {
        if (stale) return;
        setAssignments(data);
        setPositions(resolved);
      })
      .catch((error) => {
        if (stale) return;
        console.error('Failed to load assignments:', error);
        toast.error('Failed to load assignments');
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [fetchRows]);

  // Second line of the identity block is the EVENT — person.event_name is the
  // athlete's ring name, a different thing despite the column name.
  useEffect(() => {
    let cancelled = false;
    getEventById(eventId)
      .then((e) => { if (!cancelled) setEventName(e?.name ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId]);

  const positionOf = useCallback(
    // A person not on the fight card (staff, or an athlete without a bout)
    // has no corner: NO_POSITION renders neutral, never red or blue.
    (a: TaskAssignment) => positions.get(a.enrollment_id) ?? NO_POSITION,
    [positions]
  );

  const handleEnrollAll = async () => {
    try {
      setIsEnrollingAll(true);
      const added = await enrollAllFighters(eventId, task.id);
      toast.success(
        added
          ? `${added} fighter${added === 1 ? '' : 's'} enrolled as Requested`
          : 'Every fighter is already on this task'
      );
      if (added) reload();
    } catch {
      toast.error('Failed to enroll fighters');
    } finally {
      setIsEnrollingAll(false);
    }
  };

  const handleStatusUpdate = async (assignment: TaskAssignment, newStatus: AssignmentStatus) => {
    try {
      await updateAssignmentStatus(assignment.id, newStatus);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignment.id
            ? { ...a, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
            : a
        )
      );
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
      reload();
    }
  };

  const handleNotesUpdate = async (assignment: TaskAssignment, notes: string) => {
    try {
      await updateAssignmentStatus(assignment.id, assignment.status, notes);
      setAssignments((prev) => prev.map((a) => (a.id === assignment.id ? { ...a, notes } : a)));
      toast.success('Notes updated');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this person from the task?')) return;
    try {
      await deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Assignment removed');
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  const filtered = useMemo(() => {
    const rows = assignments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      // Corner comes from the fight card, so only people on the card have one:
      // picking RED or BLUE necessarily drops staff and unpaired athletes.
      if (cornerFilter !== 'all' && positionOf(a).corner !== cornerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = a.enrollment?.person.compiled_name?.toLowerCase() || '';
        const role = a.enrollment?.role.name?.toLowerCase() || '';
        const fid = String(a.enrollment?.person.appadmin_fighter_id ?? '').toLowerCase();
        if (!name.includes(q) && !role.includes(q) && !fid.includes(q)) return false;
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

    const sorted = [...rows].sort((a, b) => compareValues(valueOf(a), valueOf(b)));
    return sort.dir === 'asc' ? sorted : sorted.reverse();
  }, [assignments, statusFilter, cornerFilter, search, sort, positionOf]);

  const toggleSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  // Corner panels count the whole task, not the filtered view — same as /music.
  const summary = useMemo(() => {
    const empty = (): PanelTotals<TaskBucket> => ({ pending: 0, in_progress: 0, completed: 0 });
    const out: CornerSummaryTotals<TaskBucket> = { red: empty(), blue: empty(), total: empty() };
    for (const a of assignments) {
      if (a.status !== 'pending' && a.status !== 'in_progress' && a.status !== 'completed') continue;
      out.total[a.status]++;
      const corner = positionOf(a).corner;
      if (corner === 'RED') out.red[a.status]++;
      else if (corner === 'BLUE') out.blue[a.status]++;
    }
    return out;
  }, [assignments, positionOf]);

  // Only people who still have to do the task are printed: 'exempt' never
  // needed it and 'cancelled' left the event. The screen keeps showing them.
  const printableAssignments = useMemo(
    () => filtered.filter((a) => a.status !== 'exempt' && a.status !== 'cancelled'),
    [filtered]
  );

  const handlePrint = async (variant: TaskSheetVariant = 'normal') => {
    setPrinting(true);
    try {
      await printTaskAssignmentsSheet({
        task,
        eventId,
        eventName,
        printedBy: user?.name || user?.email,
        assignments: printableAssignments,
        positionOf,
        variant,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to build the PDF');
    } finally {
      setPrinting(false);
    }
  };

  /*
    Four states, not a Done toggle: 'Not required' is how the staff records a
    deliberate exception. Shared by the table row and the card so the two
    views can never disagree on the choices.
  */
  const renderStatusSelect = (assignment: TaskAssignment, triggerClass: string) => (
    <Select
      value={assignment.status}
      onValueChange={(v) => handleStatusUpdate(assignment, v as AssignmentStatus)}
    >
      <SelectTrigger
        className={cn('h-8 text-xs', triggerClass, ASSIGNMENT_STATUS_TONE[assignment.status])}
        aria-label={`Status for ${assignment.enrollment?.person.compiled_name || 'person'}`}
      >
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
  );

  const renderNotesInput = (assignment: TaskAssignment) => (
    <Input
      className="h-8 text-xs"
      placeholder="Add note..."
      aria-label={`Notes for ${assignment.enrollment?.person.compiled_name || 'person'}`}
      defaultValue={assignment.notes || ''}
      onBlur={(e) => {
        if (e.target.value !== (assignment.notes || '')) handleNotesUpdate(assignment, e.target.value);
      }}
    />
  );

  const renderDeleteButton = (assignment: TaskAssignment, size: 'sm' | 'md' = 'md') => (
    <Button
      variant="ghost"
      size="icon"
      className={cn('text-muted-foreground hover:text-destructive', size === 'sm' ? 'h-7 w-7' : 'h-8 w-8')}
      title="Remove from task"
      aria-label="Remove from task"
      onClick={() => handleDelete(assignment.id)}
    >
      <Trash2 className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </Button>
  );

  const completedLabel = (assignment: TaskAssignment) =>
    assignment.completed_at ? format(new Date(assignment.completed_at), 'MMM dd, HH:mm') : '-';

  const fighterIdOf = (a: TaskAssignment) =>
    a.enrollment?.person.appadmin_fighter_id ? String(a.enrollment.person.appadmin_fighter_id) : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/events/${eventId}/tasks`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Operations &amp; Tasks
          </Link>
          <h1 className="text-3xl font-bold">{task.name}</h1>
          <p className="text-muted-foreground">
            {task.description || `Pre Event Task${eventName ? ` · ${eventName}` : ''}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border p-0.5" role="group" aria-label="Athlete view">
            {VIEWS.map(({ key, Icon, title }) => (
              <Button
                key={key}
                variant={view === key ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                title={title}
                aria-label={title}
                aria-pressed={view === key}
                onClick={() => changeView(key)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          {/*
            The intended first move on any task: put every fighter on it, then
            mark the exceptions 'Not required'. Nobody gets left off by omission.
          */}
          <Button variant="outline" size="sm" className="h-9" onClick={handleEnrollAll} disabled={isEnrollingAll}>
            <Users className="h-4 w-4 mr-2" /> {isEnrollingAll ? 'Enrolling…' : 'Enroll all fighters'}
          </Button>
          {/* Disabled when nothing is printable, so the button never hands out a blank sheet. */}
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => handlePrint('normal')}
            disabled={printing || printableAssignments.length === 0}
          >
            {printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Print
          </Button>
          {offersLabelSheet(task) && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => handlePrint('label')}
              disabled={printing || printableAssignments.length === 0}
            >
              {printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tags className="h-4 w-4 mr-2" />}
              Labels
            </Button>
          )}
          <Button size="sm" className="h-9" onClick={() => setIsAssignOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Assign
          </Button>
        </div>
      </div>

      {/* Corner summary (Medical Clearance pattern, shared with /music) */}
      <CornerSummary summary={summary} buckets={TASK_BUCKETS} />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:items-center">
        <div className="relative col-span-2 sm:col-span-1 sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, role or fighter ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={cornerFilter} onValueChange={(v) => setCornerFilter(v as typeof cornerFilter)}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Corner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Corners</SelectItem>
            <SelectItem value="RED">Red</SelectItem>
            <SelectItem value="BLUE">Blue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(ASSIGNMENT_STATUS_LABELS) as AssignmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{ASSIGNMENT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table / cards */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading people...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/10 border-dashed">
              <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="font-medium text-lg">No people found</p>
              <p className="text-muted-foreground text-sm mt-1">
                {assignments.length === 0
                  ? 'Nobody is on this task yet. Use "Enroll all fighters" or "Assign".'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : view === 'list' ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortableHead column="order" label="#" sort={sort} onSort={toggleSort} className={FIGHT_ORDER_HEAD_CLASS} center />
                    <SortableHead column="corner" label="Photo" sort={sort} onSort={toggleSort} className="w-[80px] text-center" center />
                    <SortableHead column="person" label="Fighter" sort={sort} onSort={toggleSort} className="w-[280px]" />
                    <TableHead className="w-[60px] text-center">WA</TableHead>
                    <SortableHead column="role" label="Role" sort={sort} onSort={toggleSort} />
                    <SortableHead column="status" label="Status" sort={sort} onSort={toggleSort} />
                    <SortableHead column="completed" label="Completed" sort={sort} onSort={toggleSort} />
                    <SortableHead column="notes" label="Notes" sort={sort} onSort={toggleSort} className="w-[220px]" />
                    <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((assignment) => {
                    const person = assignment.enrollment?.person;
                    const position = positionOf(assignment);
                    const name = person?.compiled_name || '';
                    return (
                      <TableRow key={assignment.id} className="hover:bg-muted/50 transition-colors">
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
                          <FighterIdentity name={name} fighterId={fighterIdOf(assignment)} eventName={eventName} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center"><WhatsAppPlaceholder /></div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">{assignment.enrollment?.role.name}</Badge>
                        </TableCell>
                        <TableCell>{renderStatusSelect(assignment, 'w-[150px]')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{completedLabel(assignment)}</TableCell>
                        <TableCell>{renderNotesInput(assignment)}</TableCell>
                        <TableCell>{renderDeleteButton(assignment)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Card stack — the /music mobile card, laid out in columns on wider screens. */
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((assignment) => {
                const person = assignment.enrollment?.person;
                const position = positionOf(assignment);
                const name = person?.compiled_name || '';
                return (
                  <div key={`c-${assignment.id}`} className="rounded-lg border bg-card overflow-hidden">
                    <div className="flex items-stretch h-full">
                      <div
                        className="flex items-center justify-center w-10 shrink-0 border-r font-bold text-lg bg-yellow-50/30 text-amber-700/80 dark:bg-yellow-500/5 dark:text-amber-400/80"
                        title="Fight number"
                      >
                        {position.fightOrder ?? '-'}
                      </div>
                      <div className="flex-1 p-3 min-w-0 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <FighterAvatar
                            name={name}
                            photoUrl={getFighterPhotoUrl(person?.appadmin_fighter_id)}
                            corner={position.corner}
                            className="h-10 w-10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm leading-tight truncate">{name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <Badge
                                variant="outline"
                                className="font-mono text-[9px] bg-background/80 text-muted-foreground border-muted-foreground/30 px-1 py-0 h-4"
                              >
                                ID: {fighterIdOf(assignment) || 'N/A'}
                              </Badge>
                              <Badge variant="secondary" className="font-normal text-[10px] px-1.5 py-0 h-4">
                                {assignment.enrollment?.role.name}
                              </Badge>
                              {position.corner && (
                                <Badge
                                  variant="outline"
                                  className={cn('font-mono text-[9px] px-1 py-0 h-4', CORNER_BADGE_CLASS[position.corner])}
                                >
                                  {position.corner}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <WhatsAppPlaceholder />
                            {renderDeleteButton(assignment, 'sm')}
                          </div>
                        </div>

                        <div className="space-y-1.5 border-t border-border/40 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              {renderStatusSelect(assignment, 'min-w-[130px] flex-1')}
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{completedLabel(assignment)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">Notes</span>
                            <div className="flex-1 min-w-0">{renderNotesInput(assignment)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignPeopleDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        eventId={eventId}
        taskId={task.id}
        onAssigned={reload}
      />
    </div>
  );
}
