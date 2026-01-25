import { createClient } from '@/lib/supabase/client';
import { FighterStats, FighterStatsFormData, EventWeighIn, EventWeighInFormData, WEIGHT_CLASS_LIMITS } from '@/types/stats';

const supabase = createClient();

// ==================== FIGHTER STATS ====================

export async function getFighterStats(personId: string): Promise<FighterStats | null> {
  const { data, error } = await supabase
    .from('mma_athlete_stats')
    .select(`
      *,
      person:mma_people!inner(id, full_name, role, nationality)
    `)
    .eq('person_id', personId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch fighter stats');
  }

  return data;
}

export async function getEventFighterStats(eventId: string): Promise<FighterStats[]> {
  // Get all fighters enrolled in event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select('person_id')
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  const personIds = enrolled?.map(e => e.person_id) || [];
  
  if (personIds.length === 0) return [];

  const { data, error } = await supabase
    .from('mma_athlete_stats')
    .select(`
      *,
      person:mma_people!inner(id, full_name, role, nationality)
    `)
    .in('person_id', personIds);

  if (error) throw new Error('Failed to fetch event fighter stats');

  return data || [];
}

export async function createFighterStats(personId: string, formData: FighterStatsFormData): Promise<FighterStats> {
  const { data, error } = await supabase
    .from('mma_athlete_stats')
    .insert({
      person_id: personId,
      height_cm: formData.height_cm || null,
      reach_cm: formData.reach_cm || null,
      weight_class: formData.weight_class || null,
      wins: formData.wins,
      losses: formData.losses,
      draws: formData.draws,
      no_contests: formData.no_contests,
      wins_ko: formData.wins_ko,
      wins_submission: formData.wins_submission,
      wins_decision: formData.wins_decision,
      losses_ko: formData.losses_ko,
      losses_submission: formData.losses_submission,
      losses_decision: formData.losses_decision,
      fighting_style: formData.fighting_style || null,
      team_gym: formData.team_gym || null,
      nickname: formData.nickname || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create fighter stats');

  return data;
}

export async function updateFighterStats(statsId: string, formData: Partial<FighterStatsFormData>): Promise<FighterStats> {
  const { data, error } = await supabase
    .from('mma_athlete_stats')
    .update(formData)
    .eq('id', statsId)
    .select()
    .single();

  if (error) throw new Error('Failed to update fighter stats');

  return data;
}

export async function upsertFighterStats(personId: string, formData: FighterStatsFormData): Promise<FighterStats> {
  const existing = await getFighterStats(personId);
  
  if (existing) {
    return updateFighterStats(existing.id, formData);
  } else {
    return createFighterStats(personId, formData);
  }
}

// ==================== EVENT WEIGH-INS ====================

export async function getEventWeighIns(eventId: string): Promise<EventWeighIn[]> {
  const { data, error } = await supabase
    .from('mma_event_weigh_ins')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, full_name),
        person_id
      )
    `)
    .eq('event_id', eventId)
    .order('weigh_in_time', { ascending: true });

  if (error) throw new Error('Failed to fetch weigh-ins');

  // Get stats for each fighter to show limits
  const results = await Promise.all(
    (data || []).map(async (weighIn) => {
      const stats = await getFighterStats(weighIn.enrolled.person_id);
      return {
        ...weighIn,
        enrolled: {
          ...weighIn.enrolled,
          stats,
        },
      };
    })
  );

  return results;
}

export async function createWeighIn(eventId: string, formData: EventWeighInFormData): Promise<EventWeighIn> {
  // Get enrolled data to check weight class
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select('person_id')
    .eq('id', formData.enrolled_id)
    .single();

  if (enrolledError) throw new Error('Failed to fetch enrolled data');

  // Get fighter stats to determine if made weight
  const stats = await getFighterStats(enrolled.person_id);
  
  let madeWeight = true;
  let weightMissKg: number | null = null;

  if (stats?.weight_class && stats.weight_class !== 'catch_weight') {
    const limit = WEIGHT_CLASS_LIMITS[stats.weight_class].kg;
    if (formData.official_weight_kg > limit) {
      madeWeight = false;
      weightMissKg = formData.official_weight_kg - limit;
    }
  }

  const { data, error } = await supabase
    .from('mma_event_weigh_ins')
    .insert({
      event_id: eventId,
      enrolled_id: formData.enrolled_id,
      official_weight_kg: formData.official_weight_kg,
      weigh_in_time: formData.weigh_in_time || new Date().toISOString(),
      made_weight: madeWeight,
      weight_miss_kg: weightMissKg,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create weigh-in');

  return data;
}

export async function updateWeighIn(weighInId: string, formData: Partial<EventWeighInFormData>): Promise<EventWeighIn> {
  const updateData: Record<string, unknown> = { ...formData };

  // Recalculate made_weight if weight changed
  if (formData.official_weight_kg !== undefined) {
    const { data: current } = await supabase
      .from('mma_event_weigh_ins')
      .select('enrolled:mma_enrollments!inner(person_id)')
      .eq('id', weighInId)
      .single();

    if (current) {
      const enrolledData: any = current.enrolled;
      const personId = Array.isArray(enrolledData) ? enrolledData[0].person_id : enrolledData.person_id;
      const stats = await getFighterStats(personId);
      
      if (stats?.weight_class && stats.weight_class !== 'catch_weight') {
        const limit = WEIGHT_CLASS_LIMITS[stats.weight_class].kg;
        updateData.made_weight = formData.official_weight_kg <= limit;
        updateData.weight_miss_kg = formData.official_weight_kg > limit 
          ? formData.official_weight_kg - limit 
          : null;
      }
    }
  }

  const { data, error } = await supabase
    .from('mma_event_weigh_ins')
    .update(updateData)
    .eq('id', weighInId)
    .select()
    .single();

  if (error) throw new Error('Failed to update weigh-in');

  return data;
}

export async function deleteWeighIn(weighInId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_event_weigh_ins')
    .delete()
    .eq('id', weighInId);

  if (error) throw new Error('Failed to delete weigh-in');
}

// ==================== UTILITIES ====================

export function calculateRecord(stats: FighterStats): string {
  return `${stats.wins}-${stats.losses}${stats.draws > 0 ? `-${stats.draws}` : ''}${stats.no_contests > 0 ? ` (${stats.no_contests} NC)` : ''}`;
}

export function formatHeight(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}" (${cm}cm)`;
}

export function formatReach(cm: number): string {
  const inches = Math.round(cm / 2.54);
  return `${inches}" (${cm}cm)`;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}
