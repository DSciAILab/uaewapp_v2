import { createClient } from '@/lib/supabase/client';
import { EntranceMusic, EntranceMusicFormData, MusicStatus } from '@/types/music';

const supabase = createClient();

export async function getAthleteMusic(enrolledId: string): Promise<EntranceMusic[]> {
  const { data, error } = await supabase
    .from('mma_athlete_music')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('enrolled_id', enrolledId)
    .order('walkout_order', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch athlete music');
  }

  return data || [];
}

export async function getEventMusic(eventId: string): Promise<EntranceMusic[]> {
  const { data, error } = await supabase
    .from('mma_athlete_music')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, full_name, role)
      )
    `)
    .eq('event_id', eventId)
    .order('walkout_order', { ascending: true });

  if (error) throw new Error('Failed to fetch event music');

  return data || [];
}

export async function createAthleteMusic(eventId: string, formData: EntranceMusicFormData): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_athlete_music')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      song_title: formData.song_title,
      artist: formData.artist,
      source_type: formData.source_type,
      source_url: formData.source_url || null,
      start_time_seconds: formData.start_time_seconds || 0,
      duration_seconds: formData.duration_seconds || null,
      status: formData.status || 'pending',
      walkout_order: formData.walkout_order || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create music entry');

  return data;
}

export async function updateAthleteMusic(musicId: string, formData: Partial<EntranceMusicFormData>): Promise<EntranceMusic> {
  const { data, error } = await supabase
    .from('mma_athlete_music')
    .update(formData)
    .eq('id', musicId)
    .select()
    .single();

  if (error) throw new Error('Failed to update music entry');

  return data;
}



export async function updateMusicStatus(musicId: string, status: MusicStatus): Promise<EntranceMusic> {
  return updateAthleteMusic(musicId, { status });
}
