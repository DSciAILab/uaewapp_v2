import { createClient } from '@/lib/supabase/client';
import { getEnrollmentsByEvent } from './enrollments';

/**
 * An assignment's status IS the decision record (UAE-23).
 *
 * The operating rule: enroll everyone in a task, then mark 'exempt' whoever
 * does not need it. That way "no assignment at all" means nobody has decided
 * yet — a gap the dashboard paints in the alarm colour — instead of being
 * indistinguishable from "decided this person is exempt".
 */
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'exempt' | 'cancelled';

/**
 * Labels the staff sees, in the order they appear in the UI.
 *
 * 'cancelled' is not 'exempt': exempt means this person never needed the task,
 * cancelled means they left the event so it will not happen (UAE-26). Both drop
 * out of the progress count, but only cancelled tells you something changed.
 */
export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'Requested',
  in_progress: 'In Progress',
  completed: 'Done',
  exempt: 'Not required',
  cancelled: 'Cancelled',
};

// Types
export interface TaskAssignment {
  id: string;
  task_id: string;
  enrollment_id: string;
  status: AssignmentStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  enrollment?: {
    id: string;
    event_id: string;
    person: {
      id: string;
      compiled_name: string;
      name?: string;
      surname?: string;
      appadmin_fighter_id?: string | number | null;
      /** Ring name — what the fight card prints, not the event's name. */
      event_name?: string | null;
    };
    role: {
      name: string;
      code: string;
    };
  };
}

function getClient() {
  return createClient();
}

export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_task_assignments')
    .select(`
      *,
      enrollment:mma_enrollments!inner(
        id,
        event_id,
        person:mma_people(id, compiled_name:compiled_name, name, surname, appadmin_fighter_id, event_name),
        role:mma_roles(name, code)
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch task assignments');

  return (data || []) as unknown as TaskAssignment[];
}

export async function createAssignments(taskId: string, enrollmentIds: string[]): Promise<void> {
  const supabase = getClient();
  
  const payload = enrollmentIds.map(eid => ({
    task_id: taskId,
    enrollment_id: eid,
    status: 'pending'
  }));

  const { error } = await supabase
    .from('mma_task_assignments')
    .insert(payload);

  if (error) {
    console.error('Create assignments error:', error);
    throw new Error('Failed to create assignments');
  }
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
  notes?: string
): Promise<void> {
  const supabase = getClient();

  const payload: {
    status: AssignmentStatus;
    updated_at: string;
    completed_at?: string | null;
    notes?: string;
  } = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'completed') {
    payload.completed_at = new Date().toISOString();
  } else {
    // Anything that is not Done has no completion time — including a status
    // walked back from Done, which must not keep a stale timestamp.
    payload.completed_at = null;
  }

  if (notes !== undefined) {
    payload.notes = notes;
  }

  const { error } = await supabase
    .from('mma_task_assignments')
    .update(payload)
    .eq('id', assignmentId);

  if (error) throw new Error('Failed to update assignment');
}

/**
 * Marks every still-open task of one enrolment as cancelled, and reports how
 * many changed (UAE-26).
 *
 * Used when an athlete leaves the event: the work will not happen, but deleting
 * the rows would erase the record that it was ever expected. Tasks already Done
 * keep their result — the athlete really did do them — and ones already exempt
 * or cancelled are left alone, which also makes calling this twice harmless.
 */
export async function cancelAssignmentsForEnrollment(enrollmentId: string): Promise<number> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_task_assignments')
    .update({ status: 'cancelled', completed_at: null, updated_at: new Date().toISOString() })
    .eq('enrollment_id', enrollmentId)
    .in('status', ['pending', 'in_progress'])
    .select('id');

  if (error) throw new Error('Failed to cancel the assignments');
  return data?.length ?? 0;
}

/** How many tasks a cancel would touch, so the dialog can say the number first. */
export async function countOpenAssignments(enrollmentId: string): Promise<number> {
  const supabase = getClient();
  const { count, error } = await supabase
    .from('mma_task_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', enrollmentId)
    .in('status', ['pending', 'in_progress']);

  if (error) throw new Error('Failed to count the assignments');
  return count ?? 0;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_task_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw new Error('Failed to delete assignment');
}

/**
 * Enrols every active fighter who is not on the task yet, as 'Requested'.
 *
 * This is the first half of the operating rule: put everyone on the task in one
 * click, then mark the exceptions 'Not required'. Doing it person by person is
 * how someone gets forgotten — and a forgotten athlete is invisible, because
 * "nobody enrolled him" looks the same as "nobody got round to him".
 *
 * Only fighters: coaches and staff are enrolled deliberately, not in bulk.
 * Returns how many were added, so the caller can say nothing was missing.
 */
export async function enrollAllFighters(eventId: string, taskId: string): Promise<number> {
  const unassigned = await getUnassignedEnrollments(eventId, taskId);
  const fighters = unassigned.filter((e) => e.role?.code === 'F');
  if (fighters.length === 0) return 0;

  await createAssignments(taskId, fighters.map((e) => e.id));
  return fighters.length;
}

export async function getUnassignedEnrollments(eventId: string, taskId: string) {
  // 1. Get all enrollments
  const allEnrollments = await getEnrollmentsByEvent(eventId);
  
  // 2. Get existing assignments
  const existingAssignments = await getTaskAssignments(taskId);
  const assignedIds = new Set(existingAssignments.map(a => a.enrollment_id));
  
  // 3. Filter
  return allEnrollments.filter(e => !assignedIds.has(e.id));
}
