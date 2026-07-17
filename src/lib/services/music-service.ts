import { createClient } from '@/lib/supabase/client';
import { EntranceMusic, EntranceMusicFormData, MusicStatus } from '@/types/music';
import { getFightCardData } from './stats-service';
import { normalizeName } from '@/lib/utils';

function getClient() {
  return createClient();
}

export async function getAthleteMusic(enrolledId: string): Promise<EntranceMusic[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, compiled_name:compiled_name)
      )
    `)
    .eq('enrolled_id', enrolledId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch athlete music');
  }

  return (data || []) as unknown as EntranceMusic[];
}

export async function getEventMusic(eventId: string): Promise<EntranceMusic[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        corner,
        person:mma_people!inner(id, compiled_name:compiled_name, appadmin_fighter_id, event_name)
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch event music');

  return (data || []) as unknown as EntranceMusic[];
}

export async function getAllActiveEventsMusic(): Promise<(EntranceMusic & { event_name?: string })[]> {
  const supabase = getClient();

  // Get active event IDs
  const { data: activeEvents, error: evError } = await supabase
    .from('mma_events')
    .select('id, name')
    .eq('status', 'active');

  if (evError || !activeEvents?.length) return [];

  const eventIds = activeEvents.map((e: { id: string; name: string }) => e.id);
  const eventNameMap = Object.fromEntries(activeEvents.map((e: { id: string; name: string }) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        corner,
        person:mma_people!inner(id, compiled_name:compiled_name, appadmin_fighter_id, event_name)
      )
    `)
    .in('event_id', eventIds)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch all music');

  return (data || []).map((m) => ({
    ...m,
    event_name: eventNameMap[m.event_id] || 'Unknown Event',
  })) as unknown as (EntranceMusic & { event_name?: string })[];
}

export async function getActiveEventsFighters(): Promise<Array<{
  enrollment_id: string;
  event_id: string;
  event_name: string;
  person_name: string;
  appadmin_fighter_id: string | null;
  phone: string | null;
  corner: string | null;
  fight_order: number | null;
  has_music: boolean;
}>> {
  const supabase = getClient();

  const { data: activeEvents, error: evError } = await supabase
    .from('mma_events')
    .select('id, name')
    .eq('status', 'active');

  if (evError || !activeEvents?.length) return [];

  const eventIds = activeEvents.map((e: { id: string; name: string }) => e.id);
  const eventNameMap = Object.fromEntries(activeEvents.map((e: { id: string; name: string }) => [e.id, e.name]));

  // Get all fighter enrollments from active events
  const { data: enrollments, error: enError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      event_id,
      corner,
      role:mma_roles!inner(code),
      person:mma_people!inner(id, compiled_name:compiled_name, appadmin_fighter_id, phone, name, surname, event_name)
    `)
    .in('event_id', eventIds)
    .eq('status', 'active')
    .eq('role.code', 'F');

  if (enError) throw new Error('Failed to fetch fighters');

  // Get existing music entries
  const { data: musicEntries } = await supabase
    .from('mma_entrance_music')
    .select('enrolled_id')
    .in('event_id', eventIds);

  const musicSet = new Set((musicEntries || []).map((m: { enrolled_id: string }) => m.enrolled_id));

  // Corner and fight order come from the fight-card CSV, matched by name —
  // the same source the Medical Clearance page uses (enrollments.corner is
  // mostly null and is NOT what the ops team maintains).
  interface FightCardRow { name: string | null; matchNumber: number | null; corner: 'RED' | 'BLUE' | null }
  let fightCard: FightCardRow[] = [];
  try {
    fightCard = await getFightCardData();
  } catch (err) {
    console.warn('[music-service] failed to fetch fight card:', err);
  }

  return (enrollments || []).map((e) => {
    const person = (Array.isArray(e.person) ? e.person[0] : e.person) as {
      compiled_name: string;
      appadmin_fighter_id: string | null;
      phone: string | null;
      name: string | null;
      surname: string | null;
      event_name: string | null;
    } | null;

    const fullName = `${person?.name || ''} ${person?.surname || ''}`.trim();
    const ringName = person?.event_name || '';
    const match =
      fightCard.find((c) => {
        const pName = normalizeName(fullName);
        const eName = normalizeName(ringName);
        const cName = normalizeName(c.name || '');
        return (
          pName === cName ||
          eName === cName ||
          (cName.length > 3 && pName.includes(cName)) ||
          (pName.length > 3 && cName.includes(pName)) ||
          (cName.length > 3 && eName.includes(cName)) ||
          (eName.length > 3 && cName.includes(eName))
        );
      }) || { matchNumber: null, corner: null, name: null };

    return {
      enrollment_id: e.id,
      event_id: e.event_id,
      event_name: eventNameMap[e.event_id] || 'Unknown',
      person_name: match.name || person?.compiled_name || 'Unknown',
      appadmin_fighter_id: person?.appadmin_fighter_id || null,
      phone: person?.phone || null,
      corner: match.corner || e.corner || null,
      fight_order: match.matchNumber ?? null,
      has_music: musicSet.has(e.id),
    };
  });
}

export async function createAthleteMusic(eventId: string, formData: EntranceMusicFormData): Promise<EntranceMusic> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      source_type: formData.source_type,
      source_url: formData.source_url || null,
      start_time_seconds: formData.start_time_seconds || 0,
      source_url_2: formData.source_url_2 || null,
      start_time_2: formData.start_time_2 || null,
      source_url_3: formData.source_url_3 || null,
      start_time_3: formData.start_time_3 || null,
      status: formData.status,
      status_1: formData.status_1 || 'pending',
      status_2: formData.status_2 || 'pending',
      status_3: formData.status_3 || 'pending',
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating music:', error);
    throw new Error('Failed to create music entry');
  }

  return data as unknown as EntranceMusic;
}

export async function updateAthleteMusic(musicId: string, formData: Partial<EntranceMusicFormData>): Promise<EntranceMusic> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .update({
      enrolled_id: formData.enrolled_id,
      source_type: formData.source_type,
      source_url: formData.source_url,
      start_time_seconds: formData.start_time_seconds,
      source_url_2: formData.source_url_2,
      start_time_2: formData.start_time_2,
      source_url_3: formData.source_url_3,
      start_time_3: formData.start_time_3,
      status: formData.status,
      status_1: formData.status_1,
      status_2: formData.status_2,
      status_3: formData.status_3,
      notes: formData.notes,
    })
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update music entry');

  return data as unknown as EntranceMusic;
}



export async function updateMusicStatus(musicId: string, status: MusicStatus): Promise<EntranceMusic> {
  return updateAthleteMusic(musicId, { status });
}

export async function deleteMusic(musicId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_entrance_music')
    .delete()
    .eq('id', musicId);

  if (error) throw new Error('Failed to delete music entry');
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/* ---------- Walkout change log (UAE-20) ---------- */

export interface MusicLogEntry {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

/** Best-effort: a failed log write never blocks the actual save. */
export async function logMusicChange(
  eventId: string,
  enrolledId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  if ((oldValue ?? '') === (newValue ?? '')) return;
  const supabase = getClient();
  const { error } = await supabase.from('mma_entrance_music_log').insert({
    event_id: eventId,
    enrolled_id: enrolledId,
    field,
    old_value: oldValue,
    new_value: newValue,
  });
  if (error) console.warn('[music-service] log write failed:', error.message);
}

export async function getMusicHistory(enrolledId: string): Promise<MusicLogEntry[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_entrance_music_log')
    .select('id, field, old_value, new_value, changed_at')
    .eq('enrolled_id', enrolledId)
    .order('changed_at', { ascending: false });
  if (error) throw new Error('Failed to fetch music history');
  return (data || []) as MusicLogEntry[];
}
