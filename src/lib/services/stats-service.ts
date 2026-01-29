// @ts-nocheck
import { createClient } from '@/lib/supabase/client';
import { FighterStats, FighterStatsFormData, EventWeighIn, EventWeighInFormData, WEIGHT_CLASS_LIMITS, CoachData, CoachDataFormData } from '@/types/stats';

function getClient() {
  return createClient();
}

// ==================== FIGHTER STATS ====================

export async function getFighterStats(personId: string): Promise<FighterStats | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .select(`
      *,
      person:mma_people!inner(id, full_name:compiled_name, nationality, fighter_id, event_name)
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
  const supabase = getClient();
  
  // 1. Get all fighters enrolled in the event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      person_id,
      person_id,
      person:mma_people!inner(id, full_name:compiled_name, nationality, fighter_id, event_name),
      role:mma_roles!inner(code)
    `)
    .eq('event_id', eventId)
    .eq('role.code', 'F')
    .eq('status', 'active');
    
  // Note: .eq('role.code', 'F') might not work on joined table for filtering in some Supabase versions if not inner joined correctly,
  // but !inner implies it. Safe fallback is in-memory filter if needed, but inner join filter is standard.

  if (enrolledError) throw enrolledError;
  
  if (!enrolled || enrolled.length === 0) return [];

  const personIds = enrolled.map(e => e.person_id);

  // 2. Get existing stats for these people
  const { data: stats, error: statsError } = await supabase
    .from('mma_fighter_stats')
    .select(`
      *,
      person:mma_people!inner(id, full_name:compiled_name, nationality, fighter_id, event_name)
    `)
    .in('person_id', personIds);

  if (statsError) {
    console.error('Supabase error fetching stats:', statsError);
    throw new Error('Failed to fetch event fighter stats');
  }

  // 3. Merge results - ensure everyone enrolled shows up
  const statsMap = new Map(stats?.map(s => [s.person_id, s]));
  
  return enrolled.map(e => {
    const existing = statsMap.get(e.person_id);
    if (existing) return existing;
    
    // Return placeholder for UI
    return {
      id: `temp_${e.person_id}`, // Temporary ID for React keys
      person_id: e.person_id,
      person: e.person as any,
      
      // Defaults
      wins: 0, losses: 0, draws: 0, no_contests: 0,
      wins_ko: 0, wins_submission: 0, wins_decision: 0,
      losses_ko: 0, losses_submission: 0, losses_decision: 0,
      height_cm: null, reach_cm: null, weight_class: null,
      fighting_style: null, team_gym: null, nickname: null,
      corner: null,
      uniform_size: null, shoe_size: null,
      tshirt_size: null, shorts_size: null, jacket_size: null, gloves_size: null,
      coach1_size: null, coach2_size: null, coach3_size: null,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FighterStats;
  });
}

export async function createFighterStats(personId: string, formData: FighterStatsFormData): Promise<FighterStats> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .insert({
      person_id: personId,
      height_cm: formData.height_cm || null,
      reach_cm: formData.reach_cm || null,
      weight_class: formData.weight_class || null,
      corner: formData.corner || null,
      uniform_size: formData.uniform_size || null,
      shoe_size: formData.shoe_size || null,
      tshirt_size: formData.tshirt_size || null,
      shorts_size: formData.shorts_size || null,
      jacket_size: formData.jacket_size || null,
      gloves_size: formData.gloves_size || null,
      coach1_size: formData.coach1_size || null,
      coach2_size: formData.coach2_size || null,
      coach3_size: formData.coach3_size || null,
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
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create fighter stats');

  return data;
}

export async function updateFighterStats(statsId: string, formData: Partial<FighterStatsFormData>): Promise<FighterStats> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .update({ 
        ...formData, 
        updated_at: new Date().toISOString() 
    })
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

// ... create/update methods ...

// ==================== COACH DATA ====================

// ... getCoachData ...

export async function getEventCoachData(eventId: string): Promise<CoachData[]> {
  const supabase = getClient();
  
  // 1. Get all coaches/staff enrolled in the event
  // We include 'C' (Corner/Coach) and 'ST' (Staff) as they might need uniforms too
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      person_id,
      person:mma_people!inner(id, full_name:compiled_name, nationality),
      role:mma_roles!inner(code)
    `)
    .eq('event_id', eventId)
    .in('role.code', ['C', 'ST']) 
    .eq('status', 'active');

  if (enrolledError) throw enrolledError;
  
  if (!enrolled || enrolled.length === 0) return [];

  const personIds = enrolled.map(e => e.person_id);

  // 2. Get existing coach data
  const { data: coachData, error: coachError } = await supabase
    .from('mma_coach_data')
    .select(`
      *,
      person:mma_people!inner(id, full_name:compiled_name, nationality)
    `)
    .in('person_id', personIds);

  if (coachError) {
    console.error('Supabase error fetching coach data:', coachError);
    // Don't fail completely, just return what we have or empty
    return [];
  }

  // 3. Merge
  const dataMap = new Map(coachData?.map(c => [c.person_id, c]));
  
  return enrolled.map(e => {
    const existing = dataMap.get(e.person_id);
    if (existing) return existing;
    
    // Placeholder
    return {
      id: `temp_${e.person_id}`,
      person_id: e.person_id,
      person: e.person as any,
      
      uniform_size: null,
      shoe_size: null,
      height_cm: null,
      weight_kg: null,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as CoachData;
  });
}

export async function createCoachData(personId: string, formData: CoachDataFormData): Promise<CoachData> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_coach_data')
    .insert({
      person_id: personId,
      uniform_size: formData.uniform_size || null,
      shoe_size: formData.shoe_size || null,
      height_cm: formData.height_cm || null,
      weight_kg: formData.weight_kg || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create coach data');

  return data;
}

export async function updateCoachData(dataId: string, formData: Partial<CoachDataFormData>): Promise<CoachData> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_coach_data')
    .update(formData)
    .eq('id', dataId)
    .select()
    .single();

  if (error) throw new Error('Failed to update coach data');

  return data;
}

export async function upsertCoachData(personId: string, formData: CoachDataFormData): Promise<CoachData> {
  const existing = await getCoachData(personId);
  
  if (existing) {
    return updateCoachData(existing.id, formData);
  } else {
    return createCoachData(personId, formData);
  }
}

// ==================== EVENT WEIGH-INS ====================

export async function getEventWeighIns(eventId: string): Promise<EventWeighIn[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_weigh_ins')
    .select(`
      *,
      enrolled:mma_enrollments!inner(
        id,
        person:mma_people!inner(id, full_name:compiled_name),
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
  const supabase = getClient();
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
  const supabase = getClient();
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
  const supabase = getClient();
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

// ==================== UNIFORM MANAGEMENT ====================

export interface FighterCornermanRelation {
  fighter: FighterStats;
  corners: CoachData[];
  fighterEnrollmentId: string;
}

export async function getEventFighterHierarchy(eventId: string): Promise<FighterCornermanRelation[]> {
  const supabase = getClient();
  
  // 1. Get all fighters stats (which includes placeholders now due to our previous change)
  const fighters = await getEventFighterStats(eventId);
  
  // 2. Get all coach data (which includes placeholders)
  const coaches = await getEventCoachData(eventId);
  const coachMap = new Map(coaches.map(c => [c.person_id, c]));
  
  // 3. Get relationships (corners)
  const { data: fighterEnrollments } = await supabase
    .from('mma_enrollments')
    .select('id, person_id, role:mma_roles!inner(code)')
    .eq('event_id', eventId)
    .eq('status', 'active');
    
  if (!fighterEnrollments) return [];
  
  const fighterEnrollmentMap = new Map();
  const enrollmentPersonMap = new Map();
  const enrollmentMap = new Map();

  fighterEnrollments.forEach(e => {
    // Only map if role actually exists and has code property
    const code = e.role?.code;
    if (code === 'F') fighterEnrollmentMap.set(e.id, e.person_id);
    enrollmentPersonMap.set(e.id, e.person_id);
    enrollmentMap.set(e.person_id, e);
  });
  
  const fighterEnrollmentIds = Array.from(fighterEnrollmentMap.keys());
  
  if (fighterEnrollmentIds.length === 0) return [];
  
  const { data: cornersRel } = await supabase
    .from('mma_enrollment_corners')
    .select('fighter_enrollment_id, corner_enrollment_id')
    .in('fighter_enrollment_id', fighterEnrollmentIds);
    
  // Build hierarchy
  const hierarchy: FighterCornermanRelation[] = [];
  
  fighters.forEach(f => {
    // Find enrollment id for this fighter
    const enrollment = enrollmentMap.get(f.person_id);
    if (!enrollment) return; // Should not happen given getEventFighterStats logic
    
    // Find corner enrollments
    const myCornerRels = cornersRel?.filter(r => r.fighter_enrollment_id === enrollment.id) || [];
    
    const myCorners: CoachData[] = [];
    myCornerRels.forEach(r => {
        const cornerPersonId = enrollmentPersonMap.get(r.corner_enrollment_id);
        if (cornerPersonId) {
            const coach = coachMap.get(cornerPersonId);
            if (coach) myCorners.push(coach);
        }
    });

    hierarchy.push({
      fighter: f,
      corners: myCorners,
      fighterEnrollmentId: enrollment.id
    });
  });
  
  return hierarchy;
}
