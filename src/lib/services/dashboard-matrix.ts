import { createClient } from '@/lib/supabase/client';
import { getFighterPhotoUrl } from '@/lib/utils';
import { getFightCardPositions } from './fight-card-positions';
import { TASK_CATALOG, normalizeAssignmentStatus, type TaskStatus } from '@/lib/tasks-catalog';
import { isMusicDone } from '@/types/music';

/**
 * The operational dashboard's data: one row per active fighter, one cell per
 * task (UAE-23). Cell status comes from the fighter's task assignment; a task
 * with NO assignment is 'undecided' — the deliberate "nobody decided" signal.
 *
 * Walkout Music and Stats are AUTO: their status is derived from their own
 * collection data, overriding whatever the assignment says, so the dashboard
 * reflects the real collection state without a second manual step.
 */

/** Either Supabase client — the browser one or the cookie-aware server one. */
type SupabaseLike = ReturnType<typeof createClient>;

export interface MatrixCell {
  taskName: string;
  status: TaskStatus;
}

export interface MatrixRow {
  enrollmentId: string;
  personId: string;
  name: string;
  fighterId: string | null;
  photoUrl: string;
  corner: 'RED' | 'BLUE' | null;
  fightOrder: number | null;
  /** Display-only fields the war-room grid shows under the name. */
  division: string | null;
  nationality: string | null;
  /**
   * The event-scoped code (FT.006, C.043, ST.032) — the internal reference the
   * whole operation speaks in. Not the enrollment UUID, which means nothing to
   * a human standing in front of the wall display.
   */
  eventCode: string | null;
  /**
   * Where the athlete is, right now. Having a room IS the arrival signal: the
   * room is only assigned at check-in, so a filled room_number means they are
   * in the hotel. No room yet -> the inbound flight is what the operator needs.
   */
  roomNumber: string | null;
  arrival: { flightNumber: string; date: string; time: string; airport: string } | null;
  /** Out of the event, but kept on the board as the record of who dropped. */
  cancelled: boolean;
  cells: Record<string, MatrixCell>;
}

export interface DashboardMatrix {
  eventName: string;
  tasks: typeof TASK_CATALOG;
  rows: MatrixRow[];
}

/**
 * @param client Pass a server-side Supabase client when calling from a route
 * handler. RLS denies the anonymous role, so the default browser client only
 * returns rows when it carries the signed-in user's session.
 */
export async function getDashboardMatrix(
  eventId: string,
  client?: SupabaseLike
): Promise<DashboardMatrix> {
  const supabase = client ?? createClient();

  const [{ data: event }, { data: enrollments }] = await Promise.all([
    supabase.from('mma_events').select('name').eq('id', eventId).maybeSingle(),
    supabase
      .from('mma_enrollments')
      // Cancelled athletes stay on the board, marked (UAE-26). Dropping them
      // hid the very thing the operator needs to see: who left, and what of
      // their logistics is still booked.
      .select('id, person_id, status, event_code, person:mma_people(id, compiled_name, event_name, appadmin_fighter_id, nationality), role:mma_roles!inner(code)')
      .eq('event_id', eventId)
      .in('status', ['active', 'cancelled'])
      .eq('role.code', 'F'),
  ]);

  const roster = (enrollments || []).map((e) => {
    const p = Array.isArray(e.person) ? e.person[0] : e.person;
    return {
      enrollmentId: e.id as string,
      personId: e.person_id as string,
      compiled: (p?.compiled_name as string) || '',
      ring: (p?.event_name as string) || null,
      fighterId: (p?.appadmin_fighter_id as string) || null,
      nationality: (p?.nationality as string) || null,
      eventCode: (e.event_code as string) || null,
      cancelled: e.status === 'cancelled',
    };
  });
  const enrollmentIds = roster.map((r) => r.enrollmentId);

  // Positions (corner + bout order), the tasks and their assignments, and the
  // two auto-sources — all in parallel.
  const [positions, tasksRes, assignmentsRes, musicRes, statsRes, hotelsRes, flightsRes] = await Promise.all([
    getFightCardPositions(
      eventId,
      roster.map((r) => ({ enrollmentId: r.enrollmentId, fullName: r.compiled, ringName: r.ring })),
      supabase
    ),
    supabase.from('mma_event_tasks').select('id, name').eq('event_id', eventId),
    supabase
      .from('mma_task_assignments')
      .select('task_id, enrollment_id, status')
      .in('enrollment_id', enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('mma_entrance_music')
      .select('enrolled_id, status, source_url, source_url_2, source_url_3')
      .eq('event_id', eventId),
    supabase
      .from('mma_fighter_stats')
      .select('person_id, confirmed_at')
      .in('person_id', roster.map((r) => r.personId)),
    // Where they are: the assigned room, or the flight still bringing them in.
    supabase
      .from('mma_hotels')
      .select('enrollment_id, room_number')
      .in('enrollment_id', enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('mma_flights')
      .select('enrollment_id, arrival_flight_number, arrival_date, arrival_time, arrival_airport')
      .in('enrollment_id', enrollmentIds.length ? enrollmentIds : ['00000000-0000-0000-0000-000000000000']),
  ]);

  // Room by enrollment. Blank rooms are dropped so an empty string never reads
  // as "checked in" downstream — absent and empty must mean the same thing.
  const roomByEnrollment = new Map<string, string>();
  for (const h of hotelsRes.data || []) {
    const room = String(h.room_number ?? '').trim();
    if (room) roomByEnrollment.set(h.enrollment_id as string, room);
  }

  // Inbound flight by enrollment, for whoever has not checked in yet.
  const arrivalByEnrollment = new Map<string, MatrixRow['arrival']>();
  for (const f of flightsRes.data || []) {
    const flightNumber = String(f.arrival_flight_number ?? '').trim();
    const date = String(f.arrival_date ?? '').trim();
    const time = String(f.arrival_time ?? '').trim().slice(0, 5);
    const airport = String(f.arrival_airport ?? '').trim();
    if (!flightNumber && !date && !time && !airport) continue;
    arrivalByEnrollment.set(f.enrollment_id as string, { flightNumber, date, time, airport });
  }

  // task_id -> canonical task name (only the six we track)
  const taskIdToName = new Map<string, string>();
  for (const t of tasksRes.data || []) {
    const match = TASK_CATALOG.find((c) => c.name.toLowerCase() === (t.name || '').trim().toLowerCase());
    if (match) taskIdToName.set(t.id as string, match.name);
  }

  // (enrollmentId, taskName) -> status, from assignments
  const assignmentStatus = new Map<string, TaskStatus>();
  for (const a of assignmentsRes.data || []) {
    const name = taskIdToName.get(a.task_id as string);
    if (!name) continue;
    assignmentStatus.set(`${a.enrollment_id}|${name}`, normalizeAssignmentStatus(a.status as string));
  }

  // AUTO: Walkout Music by enrollment. UAE-62: all 3 links (or a human confirm) =
  // done, matching the Music page badge; a partial link set = in_progress.
  const musicStatus = new Map<string, TaskStatus>();
  for (const m of musicRes.data || []) {
    const anyLink = !!(m.source_url || m.source_url_2 || m.source_url_3);
    const status = isMusicDone(m) ? 'done' : anyLink ? 'in_progress' : 'pending';
    musicStatus.set(m.enrolled_id as string, status);
  }

  // AUTO: Stats by person — confirmed = done.
  const statsConfirmed = new Set(
    (statsRes.data || []).filter((s) => s.confirmed_at).map((s) => s.person_id as string)
  );

  const rows: MatrixRow[] = roster.map((r) => {
    const pos = positions.get(r.enrollmentId);
    const cells: Record<string, MatrixCell> = {};

    for (const task of TASK_CATALOG) {
      let status: TaskStatus;
      if (task.name === 'Walkout Music') {
        // Auto source wins; falls back to the assignment decision (e.g. not_requested).
        status = musicStatus.get(r.enrollmentId) ?? assignmentStatus.get(`${r.enrollmentId}|${task.name}`) ?? 'undecided';
      } else if (task.name === 'Stats') {
        status = statsConfirmed.has(r.personId)
          ? 'done'
          : assignmentStatus.get(`${r.enrollmentId}|${task.name}`) ?? 'undecided';
      } else {
        status = assignmentStatus.get(`${r.enrollmentId}|${task.name}`) ?? 'undecided';
      }
      cells[task.name] = { taskName: task.name, status };
    }

    return {
      enrollmentId: r.enrollmentId,
      personId: r.personId,
      name: r.ring || r.compiled,
      fighterId: r.fighterId,
      photoUrl: getFighterPhotoUrl(r.fighterId) || '',
      corner: pos?.corner ?? null,
      fightOrder: pos?.fightOrder ?? null,
      division: pos?.division ?? null,
      nationality: r.nationality,
      eventCode: r.eventCode,
      roomNumber: roomByEnrollment.get(r.enrollmentId) ?? null,
      arrival: arrivalByEnrollment.get(r.enrollmentId) ?? null,
      cancelled: r.cancelled,
      cells,
    };
  });

  rows.sort((a, b) => (a.fightOrder ?? 999) - (b.fightOrder ?? 999));

  return { eventName: event?.name || 'Event', tasks: TASK_CATALOG, rows };
}
