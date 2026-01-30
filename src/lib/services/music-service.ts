import { createClient } from '@/lib/supabase/client';
import { EntranceMusic, EntranceMusicFormData, MusicStatus } from '@/types/music';

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
        person:mma_people!inner(id, full_name:compiled_name)
      )
    `)
    .eq('enrolled_id', enrolledId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch athlete music');
  }

  return data || [];
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
        person:mma_people!inner(id, full_name:compiled_name, fighter_id, event_name)
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch event music');

  return data || [];
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
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating music:', error);
    throw new Error('Failed to create music entry');
  }

  return data;
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
      notes: formData.notes,
    })
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update music entry');

  return data;
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
