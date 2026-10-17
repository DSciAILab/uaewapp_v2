'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { createAssignments, getUnassignedEnrollments } from '@/lib/services/task-assignments';
import { getFightCardPositions, type FightCardPosition } from '@/lib/services/fight-card-positions';
import { FighterAvatar } from '@/components/fighters/fighter-identity';
import { getFighterPhotoUrl } from '@/lib/utils';

/** The subset of an enrollment row this dialog reads. */
interface Candidate {
  id: string;
  role?: { name?: string; code?: string } | null;
  person?: {
    compiled_name?: string;
    name?: string;
    event_name?: string | null;
    appadmin_fighter_id?: string | number | null;
  } | null;
}

interface AssignPeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  taskId: string;
  /** Called after people were added, so the page reloads its rows. */
  onAssigned: () => void;
}

/**
 * "Assign People to Task" (UAE-98: moved out of the Task Assignments sheet so
 * the full-page task view has the same dialog). Same calls as before:
 * getUnassignedEnrollments + createAssignments, with the logged-in client.
 */
export function AssignPeopleDialog({ open, onOpenChange, eventId, taskId, onAssigned }: AssignPeopleDialogProps) {
  const [available, setAvailable] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map());
  const [selected, setSelected] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | 'fighters' | 'staff'>('all');
  const [cornerFilter, setCornerFilter] = useState<'all' | 'RED' | 'BLUE'>('all');
  const [search, setSearch] = useState('');

  // Every opening starts clean: the reset happens on the way out, so the next
  // open never shows the previous picks or filters.
  const close = () => {
    setSearch('');
    setRoleFilter('all');
    setCornerFilter('all');
    setSelected([]);
    setAvailable([]);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const data = (await getUnassignedEnrollments(eventId, taskId)) as Candidate[];
        // Candidates carry no corner of their own; the card does. Resolve it for
        // this list too, otherwise the corner filter has nothing to read.
        const resolved = await getFightCardPositions(
          eventId,
          data.map((e) => ({
            enrollmentId: e.id,
            fullName: e.person?.compiled_name || '',
            ringName: e.person?.event_name ?? null,
          }))
        );
        if (cancelled) return;
        setPositions(resolved);
        setAvailable(data);
      } catch {
        if (!cancelled) toast.error('Failed to load available people');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, eventId, taskId]);

  // Corner only exists for people on the card, so filtering by it implies
  // fighters — a staffer has no corner to match.
  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return available.filter((e) => {
      const roleCode = e.role?.code;
      if (roleFilter === 'fighters' && roleCode !== 'F') return false;
      if (roleFilter === 'staff' && roleCode === 'F') return false;

      if (cornerFilter !== 'all') {
        if ((positions.get(e.id)?.corner ?? null) !== cornerFilter) return false;
      }

      if (term) {
        const name = (e.person?.compiled_name || e.person?.name || '').toLowerCase();
        const fid = String(e.person?.appadmin_fighter_id ?? '').toLowerCase();
        if (!name.includes(term) && !fid.includes(term)) return false;
      }
      return true;
    });
  }, [available, roleFilter, cornerFilter, search, positions]);

  const allSelected = candidates.length > 0 && candidates.every((e) => selected.includes(e.id));

  const handleAssign = async () => {
    if (selected.length === 0) return;
    try {
      await createAssignments(taskId, selected);
      toast.success(`${selected.length} people assigned`);
      close();
      onAssigned();
    } catch {
      toast.error('Failed to assign people');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign People to Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 border-b pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name or fighter ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                const role = v as 'all' | 'fighters' | 'staff';
                setRoleFilter(role);
                // Staff have no corner; leaving a corner set would show an
                // empty list and look like a bug.
                if (role === 'staff') setCornerFilter('all');
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
              value={cornerFilter}
              onValueChange={(v) => {
                const corner = v as 'all' | 'RED' | 'BLUE';
                setCornerFilter(corner);
                // Picking a corner is asking for fighters.
                if (corner !== 'all' && roleFilter !== 'fighters') setRoleFilter('fighters');
              }}
              disabled={roleFilter === 'staff'}
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
              disabled={candidates.length === 0}
              onClick={() => {
                const ids = candidates.map((e) => e.id);
                setSelected((prev) =>
                  allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
                );
              }}
            >
              {allSelected ? 'Clear' : `Select all (${candidates.length})`}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto py-4">
          {candidates.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {available.length === 0 ? 'No available people to assign.' : 'Nobody matches these filters.'}
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((enrollment) => {
                const name = enrollment.person?.compiled_name || enrollment.person?.name || '';
                const position = positions.get(enrollment.id);
                return (
                  <div key={enrollment.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded border">
                    <Checkbox
                      id={enrollment.id}
                      checked={selected.includes(enrollment.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelected((prev) => [...prev, enrollment.id]);
                        else setSelected((prev) => prev.filter((id) => id !== enrollment.id));
                      }}
                    />
                    <label
                      htmlFor={enrollment.id}
                      className="flex-1 cursor-pointer flex items-center gap-3 text-sm font-medium leading-none"
                    >
                      <FighterAvatar
                        name={name}
                        photoUrl={getFighterPhotoUrl(enrollment.person?.appadmin_fighter_id)}
                        corner={position?.corner}
                        className="h-8 w-8 border-2"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {enrollment.role?.name}
                          {position?.fightOrder != null && ` · Fight ${position.fightOrder}`}
                        </span>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter className="pt-4 border-t">
          <div className="flex justify-between w-full items-center">
            <span className="text-sm text-muted-foreground">{selected.length} selected</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={handleAssign} disabled={selected.length === 0}>Assign Selected</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
