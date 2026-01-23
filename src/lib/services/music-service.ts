import { createClient } from '@/lib/supabase/client';
import { EntranceMusic, EntranceMusicFormData, MusicFilters, MusicStatus } from '@/types/music';

const supabase = createClient();

export async function getEventMusic(eventId: string, filters?: MusicFilters): Promise<EntranceMusic[]> {
  let query = supabase
    .from('mma_entrance_music')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('event_id', eventId)
    .order('walkout_order', { ascending: true, nullsFirst: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch entrance music');

  let results = data || [];

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(music =>
      music.enrolled?.person?.full_name.toLowerCase().includes(searchLower) ||
      music.song_title.toLowerCase().includes(searchLower) ||
      music.artist.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

export async function getMusicById(musicId: string): Promise<EntranceMusic | null> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('id', musicId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch music');
  }

  return data;
}

export async function getMusicByEnrolledId(enrolledId: string): Promise<EntranceMusic | null> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select('*')
    .eq('enrolled_id', enrolledId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createMusic(eventId: string, formData: EntranceMusicFormData): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      song_title: formData.song_title,
      artist: formData.artist,
      source_type: formData.source_type,
      source_url: formData.source_url || null,
      file_path: null,
      start_time_seconds: formData.start_time_seconds,
      duration_seconds: formData.duration_seconds || null,
      status: formData.status,
      walkout_order: formData.walkout_order || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create entrance music');

  return data;
}

export async function updateMusic(musicId: string, formData: Partial<EntranceMusicFormData>): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .update(formData)
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update entrance music');

  return data;
}

export async function deleteMusic(musicId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_entrance_music')
    .delete()
    .eq('id', musicId);

  if (error) throw new Error('Failed to delete entrance music');
}

export async function updateMusicStatus(musicId: string, status: MusicStatus): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .update({ status })
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update music status');

  return data;
}

export async function updateWalkoutOrder(musicId: string, order: number): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .update({ walkout_order: order })
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update walkout order');

  return data;
}

export async function reorderWalkouts(eventId: string, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => 
    supabase
      .from('mma_entrance_music')
      .update({ walkout_order: index + 1 })
      .eq('id', id)
      .eq('event_id', eventId)
  );

  await Promise.all(updates);
}

export async function getEnrolledWithoutMusic(eventId: string): Promise<Array<{
  id: string;
  person: { id: string; full_name: string; role: string };
}>> {
  // Get all fighters enrolled in event
  // Note: the role check is case-insensitive in Postgres if ILIKE is used or just check both
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      person:mma_people!inner(id, full_name, role)
    `)
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  // Filter for fighters manually to handle casing
  const fighters = (enrolled || []).filter(e => 
    e.person.role.toLowerCase() === 'fighter'
  );

  // Get enrolled IDs that already have music
  const { data: music, error: musicError } = await supabase
    .from('mma_entrance_music')
    .select('enrolled_id')
    .eq('event_id', eventId);

  if (musicError) throw musicError;

  const musicEnrolledIds = new Set(music?.map(m => m.enrolled_id) || []);

  return fighters.filter(e => !musicEnrolledIds.has(e.id));
}

export async function getMusicStats(eventId: string): Promise<{
  total: number;
  confirmed: number;
  pending: number;
  not_provided: number;
  uploaded: number;
}> {
  const { data, error } = await supabase
    .from('mma_entrance_music')
    .select('status')
    .eq('event_id', eventId);

  if (error) throw error;

  const music = data || [];

  return {
    total: music.length,
    confirmed: music.filter(m => m.status === 'confirmed').length,
    pending: music.filter(m => m.status === 'pending').length,
    not_provided: music.filter(m => m.status === 'not_provided').length,
    uploaded: music.filter(m => m.status === 'uploaded').length,
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseDuration(formatted: string): number {
  const parts = formatted.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return parseInt(formatted) || 0;
}
