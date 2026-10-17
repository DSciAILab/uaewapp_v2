import { createClient } from '@/lib/supabase/client';
import { TASK_CATALOG, findTaskBySlug, isCatalogTask } from '@/lib/tasks-catalog';
import type { EventTask } from '@/types/task';
import { createEventTask, getEventTasks } from './task-service';
import { createAssignments, enrollAllFighters } from './task-assignments';
import { syncBloodTestAssignment, syncEventBloodTestAssignments } from './pre-event-service';

/**
 * The fixed tasks of an event exist BEFORE anyone clicks (UAE-88, Fernando
 * TG 1970): every catalog task is created when the event is, and every fighter
 * is put on all of them, as Requested, the moment they are enrolled. The
 * sidebar link then always opens "who still needs to do this" — whoever does
 * not need a task is marked Not required there (UAE-23).
 *
 * Both entry points are idempotent (matched by task name, then by assignment),
 * so calling them again on an event that already has everything changes
 * nothing. Done in app code, never a DB trigger (INF-2070), and a failure here
 * never fails the event or enrolment write that triggered it.
 */

function isBloodTest(task: EventTask): boolean {
  const def = findTaskBySlug('blood-test');
  return !!def && isCatalogTask(def, task.name);
}

/**
 * One task per catalog entry, the oldest when the name exists twice (the
 * generic task form has no name guard), so every caller picks the same one.
 */
function catalogTasksOf(tasks: EventTask[]): EventTask[] {
  const byAge = [...tasks].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const picked: EventTask[] = [];
  for (const def of TASK_CATALOG) {
    const found = byAge.find((t) => isCatalogTask(def, t.name));
    if (found) picked.push(found);
  }
  return picked;
}

/**
 * Creates the catalog tasks the event is missing and enrols every active
 * fighter in all of them. Returns how many tasks and assignments were added.
 */
export async function seedCatalogTasks(eventId: string): Promise<{ created: number; enrolled: number }> {
  const result = { created: 0, enrolled: 0 };
  try {
    const existing = catalogTasksOf(await getEventTasks(eventId));
    const tasks: EventTask[] = [];
    for (const def of TASK_CATALOG) {
      const found = existing.find((t) => isCatalogTask(def, t.name));
      if (found) {
        tasks.push(found);
        continue;
      }
      const created = await createEventTask(eventId, {
        name: def.name,
        category: def.category ?? 'other',
        priority: 'medium',
        status: 'pending',
        checklist_items: [],
      });
      tasks.push(created);
      result.created += 1;
    }
    // Sequential on purpose: assignments carry no unique constraint.
    for (const task of tasks) {
      result.enrolled += await enrollAllFighters(eventId, task.id);
    }
    // Blood Test is AUTO: tests recorded before the task existed must show
    // their real status, not a blanket "Requested".
    if (tasks.some(isBloodTest)) await syncEventBloodTestAssignments(eventId);
  } catch (error) {
    console.error('Catalog task seed failed:', error);
  }
  return result;
}

/**
 * Puts one enrolment on every catalog task the event already has, as
 * Requested, skipping the tasks it is already on (whatever their status: a
 * Cancelled or Not required decision is never reopened here).
 */
export async function enrollInCatalogTasks(eventId: string, enrollmentId: string): Promise<number> {
  try {
    const tasks = catalogTasksOf(await getEventTasks(eventId));
    if (tasks.length === 0) return 0;

    const { data: existing, error } = await createClient()
      .from('mma_task_assignments')
      .select('task_id')
      .eq('enrollment_id', enrollmentId)
      .in('task_id', tasks.map((t) => t.id));
    if (error) throw error;
    const assigned = new Set((existing || []).map((row) => row.task_id));

    let added = 0;
    let bloodTestAdded = false;
    for (const task of tasks) {
      if (assigned.has(task.id)) continue;
      await createAssignments(task.id, [enrollmentId]);
      added += 1;
      if (isBloodTest(task)) bloodTestAdded = true;
    }
    if (bloodTestAdded) await syncBloodTestAssignment(eventId, enrollmentId);
    return added;
  } catch (error) {
    console.error('Catalog task enrolment failed:', error);
    return 0;
  }
}
