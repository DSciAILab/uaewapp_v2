/**
 * The six operational tasks tracked per athlete (UAE-20 / UAE-23).
 *
 * The mechanic: every active fighter is enrolled in every task by default;
 * whoever doesn't need one is marked 'not_requested'. A fighter with NO
 * assignment for a task is "undecided" — shown in a distinct colour so a
 * forgotten athlete is visible, never a silent gap.
 *
 * Two tasks are AUTO — their status is derived from their own collection
 * screen, not set by hand:
 *   - Walkout Music: songs submitted → done; some collected → in_progress.
 *   - Stats: measurements confirmed → done.
 * The other four are set directly in the Tasks tab.
 */

export type TaskStatus = 'undecided' | 'pending' | 'in_progress' | 'done' | 'not_requested' | 'cancelled';

export interface TaskDef {
  /** Canonical task name, matched against mma_event_tasks.name. */
  name: string;
  short: string;
  /** 'auto' derives status from a collection screen; 'manual' is set in Tasks. */
  mode: 'auto' | 'manual';
}

export const TASK_CATALOG: TaskDef[] = [
  { name: 'Blood Test', short: 'Blood', mode: 'manual' },
  { name: 'Photoshoot', short: 'Photo', mode: 'manual' },
  { name: 'Black Screen Video', short: 'BSV', mode: 'manual' },
  { name: 'Video Shooting', short: 'Video', mode: 'manual' },
  { name: 'Walkout Music', short: 'Music', mode: 'auto' },
  { name: 'Stats', short: 'Stats', mode: 'auto' },
];

/** Maps the assignment's stored status to the dashboard's status vocabulary. */
export function normalizeAssignmentStatus(raw: string | null | undefined): TaskStatus {
  switch ((raw || '').toLowerCase()) {
    case 'completed':
    case 'done':
      return 'done';
    case 'in_progress':
      return 'in_progress';
    case 'exempt':
    case 'not_requested':
      return 'not_requested';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'pending';
    default:
      return 'pending';
  }
}

/**
 * Cell styling per status (Fernando's scheme):
 *   undecided     → a loud highlight, because nobody decided yet (follow-up).
 *   pending       → yellow  (requested, not started)
 *   in_progress   → orange
 *   done          → green
 *   not_requested → the background colour, so an exempt task recedes from view.
 *   cancelled     → struck through and grey: the athlete left the event, so the
 *                   task will never happen, but it stays on screen as the record
 *                   of what was dropped (UAE-26). Distinct from not_requested,
 *                   which means "decided this person never needed it".
 */
export const STATUS_META: Record<TaskStatus, { label: string; tone: string; dot: string }> = {
  undecided:     { label: 'No status',    tone: 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-2 border-fuchsia-500/60 ring-1 ring-fuchsia-500/30', dot: 'bg-fuchsia-500' },
  pending:       { label: 'Requested',    tone: 'bg-yellow-400/25 text-yellow-800 dark:text-yellow-300 border border-yellow-500/50', dot: 'bg-yellow-500' },
  in_progress:   { label: 'In progress',  tone: 'bg-orange-500/25 text-orange-700 dark:text-orange-300 border border-orange-500/50', dot: 'bg-orange-500' },
  done:          { label: 'Done',         tone: 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50', dot: 'bg-emerald-500' },
  not_requested: { label: 'Not required', tone: 'bg-background text-muted-foreground/50 border border-border/50', dot: 'bg-muted-foreground/30' },
  cancelled:     { label: 'Cancelled',    tone: 'bg-muted/60 text-muted-foreground line-through border border-dashed border-muted-foreground/40', dot: 'bg-muted-foreground/50' },
};
