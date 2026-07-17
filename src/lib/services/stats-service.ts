import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';
import { FighterStats, FighterStatsFormData, EventWeighIn, EventWeighInFormData, WEIGHT_CLASS_LIMITS, CoachData, CoachDataFormData, WeightClass } from '@/types/stats';
import type { Database } from '@/types/supabase';

function getClient() {
  return createClient();
}

// ==================== ROW -> DOMAIN NARROWING ====================
// The generated DB types are wider than our domain types (nullable columns,
// `weight_class` as a free-form string). These mappers narrow rows at the
// service boundary so the rest of the app can rely on the domain contract.

type Tables = Database['public']['Tables'];
type FighterStatsRow = Tables['mma_fighter_stats']['Row'];
type CoachDataRow = Tables['mma_coach_data']['Row'];
type WeighInRow = Tables['mma_event_weigh_ins']['Row'];

type PersonJoin = {
  id: string;
  compiled_name: string | null;
  nationality?: string | null;
  role?: string | null;
  appadmin_fighter_id?: string | number | null;
  event_name?: string | null;
  passport_photo?: string | null;
} | null | undefined;

const WEIGHT_CLASSES = new Set(Object.keys(WEIGHT_CLASS_LIMITS));

/** Accepts a raw DB string only if it is a known weight class; otherwise null. */
function toWeightClass(value: string | null): WeightClass | null {
  return value !== null && WEIGHT_CLASSES.has(value) ? (value as WeightClass) : null;
}

function toPerson(person: PersonJoin): FighterStats['person'] | undefined {
  if (!person) return undefined;
  return {
    id: person.id,
    compiled_name: person.compiled_name ?? '',
    role: person.role ?? undefined,
    nationality: person.nationality ?? null,
    appadmin_fighter_id: person.appadmin_fighter_id != null ? String(person.appadmin_fighter_id) : null,
    event_name: person.event_name ?? undefined,
    passport_photo: person.passport_photo ?? null,
  };
}

function toFighterStats(
  row: FighterStatsRow & { person?: PersonJoin },
  overrides: Partial<FighterStats> = {}
): FighterStats {
  return {
    id: row.id,
    person_id: row.person_id,
    height_cm: row.height_cm,
    reach_cm: row.reach_cm,
    weight_class: toWeightClass(row.weight_class),
    corner: row.corner,
    uniform_size: row.uniform_size,
    shoe_size: row.shoe_size,
    tshirt_size: row.tshirt_size,
    shorts_size: row.shorts_size,
    jacket_size: row.jacket_size,
    gloves_size: row.gloves_size,
    coach1_size: row.coach1_size,
    coach2_size: row.coach2_size,
    coach3_size: row.coach3_size,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
    no_contests: row.no_contests ?? 0,
    wins_ko: row.wins_ko ?? 0,
    wins_submission: row.wins_submission ?? 0,
    wins_decision: row.wins_decision ?? 0,
    losses_ko: row.losses_ko ?? 0,
    losses_submission: row.losses_submission ?? 0,
    losses_decision: row.losses_decision ?? 0,
    fighting_style: row.fighting_style,
    team_gym: row.team_gym,
    nickname: row.nickname,
    residency: row.residency,
    weight_kg: row.weight_kg,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
    person: toPerson(row.person),
    ...overrides,
  };
}

function toCoachData(row: CoachDataRow & { person?: PersonJoin }): CoachData {
  return {
    id: row.id,
    person_id: row.person_id,
    uniform_size: row.uniform_size,
    shoe_size: row.shoe_size,
    height_cm: row.height_cm,
    weight_kg: row.weight_kg,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
    person: toPerson(row.person) as CoachData['person'],
  };
}

function toEventWeighIn(row: WeighInRow, enrolled?: EventWeighIn['enrolled']): EventWeighIn {
  return {
    id: row.id,
    event_id: row.event_id,
    enrolled_id: row.enrolled_id,
    official_weight_kg: row.official_weight_kg,
    weigh_in_time: row.weigh_in_time,
    // A null `made_weight` has always rendered as "missed" (falsy) downstream;
    // preserve that behaviour rather than inventing a value.
    made_weight: row.made_weight ?? false,
    weight_miss_kg: row.weight_miss_kg,
    notes: row.notes,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
    ...(enrolled ? { enrolled } : {}),
  };
}

// ==================== FIGHTER STATS ====================

export async function getFighterStats(personId: string): Promise<FighterStats | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .select(`
      *,
      person:mma_people!inner(id, compiled_name:compiled_name, nationality, appadmin_fighter_id, event_name)
    `)
    .eq('person_id', personId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch fighter stats');
  }

  return toFighterStats(data);
}

export async function getEventFighterStats(eventId: string): Promise<FighterStats[]> {
  const supabase = getClient();
  
  // 1. Get all fighters enrolled in the event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      person_id,
      corner,
      person:mma_people!inner(id, compiled_name:compiled_name, nationality, appadmin_fighter_id, event_name),
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
      person:mma_people!inner(id, compiled_name:compiled_name, nationality, appadmin_fighter_id, event_name)
    `)
    .in('person_id', personIds);

  if (statsError) {
    console.error('Supabase error fetching stats:', statsError);
    throw new Error('Failed to fetch event fighter stats');
  }

  // 3. Merge results - ensure everyone enrolled shows up
  const statsMap = new Map(stats?.map(s => [s.person_id, s]));
  
  const merged: FighterStats[] = enrolled.map(e => {
    const existing = statsMap.get(e.person_id);
    const corner = e.corner || existing?.corner || null; // Enrollment corner takes precedence

    if (existing) return { ...toFighterStats(existing, { corner }), enrollment_id: e.id };

    // Return placeholder for UI
    const now = new Date().toISOString();
    const placeholder: FighterStats = {
      id: `temp_${e.person_id}`, // Temporary ID for React keys
      person_id: e.person_id,
      // Lets the table key the shared fight-card resolver instead of relying on
      // this service's own corner lookup.
      enrollment_id: e.id,
      person: toPerson(e.person),

      // Defaults
      wins: 0, losses: 0, draws: 0, no_contests: 0,
      wins_ko: 0, wins_submission: 0, wins_decision: 0,
      losses_ko: 0, losses_submission: 0, losses_decision: 0,
      height_cm: null, reach_cm: null, weight_class: null,
      fighting_style: null, team_gym: null, nickname: null,
      corner,
      uniform_size: null, shoe_size: null,
      tshirt_size: null, shorts_size: null, jacket_size: null, gloves_size: null,
      coach1_size: null, coach2_size: null, coach3_size: null,

      created_at: now,
      updated_at: now,
    };
    return placeholder;
  });

  // 4. Enrich with CSV data (Fight Card) in background replacement logic style
  // but done here for consistency across all stats views
  try {
     const fightCard = await getFightCardData(eventId);
     if (fightCard && fightCard.length > 0) {
        return merged.map(f => {
           const match = fightCard.find((c) => {
              const pName = (f.person?.compiled_name || '').trim().toLowerCase();
              const cName = (c.name || '').trim().toLowerCase();
              return pName === cName || pName.includes(cName) || cName.includes(pName);
           });

           if (match) {
              return {
                 ...f,
                 matchNumber: match.matchNumber,
                 // Also sync corner if not set
                 corner: f.corner || (match.corner?.charAt(0).toUpperCase() + match.corner?.slice(1).toLowerCase())
              };
           }
           return f;
        });
     }
  } catch (err) {
     console.warn('Failed to enrich stats with CSV data:', err);
  }

  return merged;
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
      residency: formData.residency || null,
      weight_kg: formData.weight_kg || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create fighter stats');

  return toFighterStats(data);
}

export async function updateFighterStats(statsId: string, formData: Partial<FighterStatsFormData>): Promise<FighterStats> {
  const supabase = getClient();
  
  // Clean up formData to only include valid columns
  const allowedFields = [
    'height_cm', 'reach_cm', 'weight_class', 'corner', 'uniform_size', 'shoe_size',
    'tshirt_size', 'shorts_size', 'jacket_size', 'gloves_size',
    'coach1_size', 'coach2_size', 'coach3_size',
    'wins', 'losses', 'draws', 'no_contests',
    'wins_ko', 'wins_submission', 'wins_decision',
    'losses_ko', 'losses_submission', 'losses_decision',
    'fighting_style', 'team_gym', 'nickname', 'residency', 'weight_kg'
  ];

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  allowedFields.forEach(field => {
    if (field in formData) {
      updatePayload[field] = (formData as Record<string, unknown>)[field];
    }
  });

  const { data, error } = await supabase
    .from('mma_fighter_stats')
    .update(updatePayload as Database['public']['Tables']['mma_fighter_stats']['Update'])
    .eq('id', statsId)
    .select(`
      *,
      person:mma_people!inner(id, compiled_name:compiled_name, nationality, appadmin_fighter_id, event_name, passport_photo)
    `)
    .single();

  if (error) {
     console.error('Update fighter stats error:', error);
     throw new Error('Failed to update fighter stats');
  }

  return toFighterStats(data);
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

export async function getCoachData(personId: string): Promise<CoachData | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_coach_data')
    .select(`
      *,
      person:mma_people!inner(id, compiled_name:compiled_name, nationality)
    `)
    .eq('person_id', personId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch coach data');
  }

  return toCoachData(data);
}

export async function getEventCoachData(eventId: string): Promise<CoachData[]> {
  const supabase = getClient();
  
  // 1. Get all coaches/staff enrolled in the event
  // We include 'C' (Corner/Coach) and 'ST' (Staff) as they might need uniforms too
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      person_id,
      person:mma_people!inner(id, compiled_name:compiled_name, nationality),
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
      person:mma_people!inner(id, compiled_name:compiled_name, nationality)
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
    if (existing) return toCoachData(existing);

    // Placeholder
    const now = new Date().toISOString();
    const placeholder: CoachData = {
      id: `temp_${e.person_id}`,
      person_id: e.person_id,
      person: toPerson(e.person) as CoachData['person'],

      uniform_size: null,
      shoe_size: null,
      height_cm: null,
      weight_kg: null,

      created_at: now,
      updated_at: now,
    };
    return placeholder;
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

  return toCoachData(data);
}

export async function updateCoachData(dataId: string, formData: Partial<CoachDataFormData>): Promise<CoachData> {
  const supabase = getClient();
  
  const allowedFields = ['uniform_size', 'shoe_size', 'height_cm', 'weight_kg'];
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  allowedFields.forEach(field => {
    if (field in formData) {
      updatePayload[field] = (formData as Record<string, unknown>)[field];
    }
  });

  const { data, error } = await supabase
    .from('mma_coach_data')
    .update(updatePayload as Database['public']['Tables']['mma_coach_data']['Update'])
    .eq('id', dataId)
    .select(`
      *,
      person:mma_people!inner(id, compiled_name:compiled_name, nationality)
    `)
    .single();

  if (error) {
     console.error('Update coach data error:', error);
     throw new Error('Failed to update coach data');
  }

  return toCoachData(data);
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
        person:mma_people!inner(id, compiled_name:compiled_name, event_name, appadmin_fighter_id),
        person_id,
        corner
      )
    `)
    .eq('event_id', eventId)
    .order('weigh_in_time', { ascending: true });

  if (error) throw new Error('Failed to fetch weigh-ins');

  // Get stats for each fighter to show limits
  const results = await Promise.all(
    (data || []).map(async (weighIn) => {
      const stats = await getFighterStats(weighIn.enrolled.person_id);
      const person = toPerson(weighIn.enrolled.person);
      return toEventWeighIn(weighIn, {
        // `corner` lives on mma_enrollments, surfaced through this join.
        corner: weighIn.enrolled.corner,
        person: {
          id: weighIn.enrolled.person.id,
          compiled_name: person?.compiled_name ?? '',
          event_name: person?.event_name,
          appadmin_fighter_id: person?.appadmin_fighter_id ?? null,
        },
        ...(stats ? { stats } : {}),
      });
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

  return toEventWeighIn(data);
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
      const enrolledData = current.enrolled as { person_id: string } | { person_id: string }[];
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

  return toEventWeighIn(data);
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
export async function getFightCardData(eventId?: string): Promise<any[]> {
  let csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8I30mTm8ZyuBttmebz9wv-41TIZ-8HzHiLEYcEhXD2Y5JXCn7AD3aDmOIBpYSp-9tMF7F7obDdQsw/pub?gid=1830739607&single=true&output=csv';
  let eventCode = '';

  if (eventId) {
    const supabase = getClient();
    const { data: event } = await supabase
      .from('mma_events')
      .select('fight_card_csv_url, code')
      .eq('id', eventId)
      .single();
    
    if (event?.fight_card_csv_url) {
      csvUrl = event.fight_card_csv_url;
    }
    if (event?.code) {
      eventCode = event.code;
    }
  }

  // Add cache buster
  const targetUrl = csvUrl + (csvUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

  try {
    const response = await fetch(targetUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch CSV');
    const csvText = await response.text();
    
    const { data: rawData } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    return (rawData as any[])
      .map(row => ({
        matchNumber: row['#'] || 0,
        event: row['EVENT'],
        corner: row['CORNER']?.toUpperCase() as 'RED' | 'BLUE',
        division: row['DIVISION'],
        name: row['NAME'],
        nickname: row['NICKNAME'],
        record: row['RECORD'],
        nationality: row['NATIONALITY'],
        residency: row['RESIDENCY']
      }))
      .filter(r => {
        const matchesName = !!r.name;
        const matchesEvent = eventCode ? r.event?.toString().toUpperCase() === eventCode.toUpperCase() : true;
        return matchesName && matchesEvent;
      });
  } catch (error) {
    console.error('Error fetching fight card data:', error);
    return [];
  }
}

// ... existing code ...

// ==================== CSV IMPORT ====================

export interface StatsCSVRow {
  passport_name: string
  nickname?: string
  weight_class?: string
  height_cm?: string
  reach_cm?: string
  fighting_style?: string
  team_gym?: string
  wins?: string
  losses?: string
  draws?: string
  no_contests?: string
  wins_ko?: string
  wins_submission?: string
  wins_decision?: string
  losses_ko?: string
  losses_submission?: string
  losses_decision?: string
  corner?: string
  uniform_size?: string
  shoe_size?: string
  tshirt_size?: string
  shorts_size?: string
  jacket_size?: string
  gloves_size?: string
  residency?: string
  weight_kg?: string
}

export interface StatsImportError {
  row: number
  name: string
  message: string
}

export async function importStatsFromCSV(
  eventId: string,
  rows: StatsCSVRow[],
  onProgress?: (current: number, total: number, message?: string) => void
): Promise<{ created: number; updated: number; skipped: StatsImportError[]; errors: StatsImportError[] }> {
  const supabase = getClient()
  const errors: StatsImportError[] = []
  const skipped: StatsImportError[] = []
  let created = 0
  let updated = 0
  const total = rows.length
  const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0))

  if (onProgress) onProgress(0, total, 'Buscando lutadores do evento...')

  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      person_id,
      person:mma_people(id, compiled_name, event_name),
      role:mma_roles!inner(code)
    `)
    .eq('event_id', eventId)
    .eq('role.code', 'F')
    .eq('status', 'active')

  if (enrollError) throw new Error('Failed to fetch enrollments: ' + enrollError.message)

  const nameMap = new Map<string, string>()
  for (const e of (enrollments || [])) {
    const person = e.person
    if (!person) continue
    const compiledName = (person.compiled_name || '').trim().toLowerCase()
    const eventName = (person.event_name || '').trim().toLowerCase()
    if (compiledName) nameMap.set(compiledName, e.person_id)
    if (eventName && eventName !== compiledName) nameMap.set(eventName, e.person_id)
  }

  // Get existing stats
  const personIds = [...new Set(nameMap.values())]
  const { data: existingStats } = await supabase
    .from('mma_fighter_stats')
    .select('id, person_id')
    .in('person_id', personIds.length > 0 ? personIds : ['__none__'])

  const statsMap = new Map<string, string>()
  for (const s of (existingStats || [])) {
    statsMap.set(s.person_id, s.id)
  }

  const toNum = (v?: string) => { const n = parseInt(v || ''); return isNaN(n) ? 0 : n }
  const toNumNull = (v?: string) => { const n = parseFloat(v || ''); return isNaN(n) ? null : n }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    if (onProgress && i % 5 === 0) {
      onProgress(i, total, `Processando linha ${rowNum} de ${total}...`)
      await yieldToUI()
    }

    const passportName = (row.passport_name || '').trim()
    if (!passportName) {
      errors.push({ row: rowNum, name: '(empty)', message: 'Name is required' })
      continue
    }

    const personId = nameMap.get(passportName.toLowerCase())
    if (!personId) {
      skipped.push({ row: rowNum, name: passportName, message: 'Fighter not found in the event' })
      continue
    }

    const statsData: Database['public']['Tables']['mma_fighter_stats']['Insert'] = {
      person_id: personId,
      nickname: row.nickname || null,
      residency: row.residency || null,
      weight_kg: toNumNull(row.weight_kg),
      weight_class: row.weight_class || null,
      height_cm: toNumNull(row.height_cm),
      reach_cm: toNumNull(row.reach_cm),
      fighting_style: row.fighting_style || null,
      team_gym: row.team_gym || null,
      wins: toNum(row.wins),
      losses: toNum(row.losses),
      draws: toNum(row.draws),
      no_contests: toNum(row.no_contests),
      wins_ko: toNum(row.wins_ko),
      wins_submission: toNum(row.wins_submission),
      wins_decision: toNum(row.wins_decision),
      losses_ko: toNum(row.losses_ko),
      losses_submission: toNum(row.losses_submission),
      losses_decision: toNum(row.losses_decision),
      corner: row.corner || null,
      uniform_size: row.uniform_size || null,
      shoe_size: row.shoe_size || null,
      tshirt_size: row.tshirt_size || null,
      shorts_size: row.shorts_size || null,
      jacket_size: row.jacket_size || null,
      gloves_size: row.gloves_size || null,
      updated_at: new Date().toISOString(),
    }

    const existingId = statsMap.get(personId)
    if (existingId) {
      const { person_id, ...updateData } = statsData
      const { error: updateError } = await supabase.from('mma_fighter_stats').update(updateData).eq('id', existingId)
      if (updateError) errors.push({ row: rowNum, name: passportName, message: updateError.message })
      else updated++
    } else {
      const { error: insertError } = await supabase.from('mma_fighter_stats').insert(statsData)
      if (insertError) errors.push({ row: rowNum, name: passportName, message: insertError.message })
      else { created++; statsMap.set(personId, 'new') }
    }
  }

  if (onProgress) onProgress(total, total, 'Done!')
  return { created, updated, skipped, errors }
}
