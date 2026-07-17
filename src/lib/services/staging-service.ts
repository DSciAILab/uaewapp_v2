import { createClient } from '@/lib/supabase/client';
import { StagingCheckin, StagingRow, StagingStatus } from '@/types/staging';
import { getFightCardData } from './stats-service';
import { normalizeName, getFighterPhotoUrl } from '@/lib/utils';

function getClient() {
  return createClient();
}

interface FightCardEntry {
  name: string;
  matchNumber?: number | null;
  corner?: 'RED' | 'BLUE' | null;
}

export async function getStagingData(eventId: string): Promise<StagingRow[]> {
  const supabase = getClient();
  
  // 1. Get all enrollments for this event
  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      person:mma_people(id, name, surname, nationality, appadmin_fighter_id, passport_photo, event_name),
      event:mma_events(name),
      role:mma_roles!inner(code)
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('role.code', 'F');



  if (enrollError) {
    console.error('Enrollment fetch error:', enrollError);
    throw enrollError;
  }
  
  console.log('Staging Service - Enrollments fetched:', enrollments?.length);
  if (!enrollments || enrollments.length === 0) return [];

  // 2. Get existing staging records
  const { data: checkins, error: checkinError } = await supabase
    .from('mma_staging_checkins')
    .select('*')
    .eq('event_id', eventId);

  if (checkinError) throw checkinError;

  // 3. Get Fight Card Data for Corner/Order info
  let fightCard: FightCardEntry[] = [];
  try {
    fightCard = await getFightCardData();
  } catch (err) {
    console.warn('Failed to fetch fight card data for staging:', err);
  }

  const checkinMap = new Map<string, StagingCheckin>();
  checkins?.forEach((c) => checkinMap.set(c.enrolled_id, c as unknown as StagingCheckin));

  // 4. Merge and fill gaps
  const result: StagingRow[] = [];
  
  for (const enr of enrollments) {
    const person = Array.isArray(enr.person) ? enr.person[0] : enr.person;

    if (!person) {
        console.warn('Missing person for enrollment:', enr.id);
        continue;
    }

    const fullName = `${person.name || ''} ${person.surname || ''}`.trim();
    const eventName = person.event_name || '';

    // Match with Fight Card to get Corner / Match #
    // Also serves as a filter: "Only fighters must be shown"
    const match = fightCard.find((c) => {
        const pName = normalizeName(fullName);
        const eName = normalizeName(eventName);
        const cName = normalizeName(c.name);
        
        // Robust matching: check full name, event name, or partial inclusion
        return pName === cName || 
               eName === cName || 
               (cName.length > 3 && pName.includes(cName)) || 
               (pName.length > 3 && cName.includes(pName)) ||
               (cName.length > 3 && eName.includes(cName)) ||
               (eName.length > 3 && cName.includes(eName));
    });

    // If "Only fighters must be shown in this list", and we rely on the fight card for that:
    // If not in fight card, we still want to show them if they are enrolled (per user report "show everyone")
    // Use defaults if not matched
    const matchData = match || { matchNumber: null, corner: null, name: null };


    const existing = checkinMap.get(enr.id);
    
    result.push({
      id: existing?.id || `temp_${enr.id}`,
      event_id: eventId,
      enrolled_id: enr.id,
      bus_number: existing?.bus_number || null,
      bus_time: existing?.bus_time || null,
      passport_status: (existing?.passport_status as StagingStatus) || 'pending',
      nails_status: (existing?.nails_status as StagingStatus) || 'pending',
      cup_status: (existing?.cup_status as StagingStatus) || 'pending',
      mouthguard_status: (existing?.mouthguard_status as StagingStatus) || 'pending',
      uniform_status: (existing?.uniform_status as StagingStatus) || 'pending',
      coaches_with_bus_count: existing?.coaches_with_bus_count || 0,
      coaches_credentials_given: existing?.coaches_credentials_given || 0,
      notes: existing?.notes || null,
      call_order: existing?.call_order || matchData.matchNumber || 999, // Fallback to end
      fight_order: matchData.matchNumber || null,
      corner: matchData.corner || null,
      is_completed: existing?.is_completed || false,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: existing?.updated_at || new Date().toISOString(),
      person: {
        id: person.id,
        compiled_name: matchData.name || eventName || fullName, // Use Fight Card name -> Event Name -> Full Name
        nationality: person.nationality,
        appadmin_fighter_id: person.appadmin_fighter_id,
        photo_url: getFighterPhotoUrl(person.appadmin_fighter_id) || person.passport_photo
      },
      event_name: Array.isArray(enr.event) ? enr.event[0]?.name : enr.event?.name
    });
  }

  return result.sort((a, b) => {
    // Sort by fight_order (ascending), nulls last
    const orderA = a.fight_order ?? 999;
    const orderB = b.fight_order ?? 999;
    return orderA - orderB;
  });
}

// Upsert a record. If ID is 'temp_', we disregard it and match by enrolled_id/event_id
export async function updateStagingItem(
  eventId: string,
  enrolledId: string,
  updates: Partial<StagingCheckin>
): Promise<StagingCheckin> {
  const supabase = getClient();
  
  // Clean allowed fields
  const payload = {
    event_id: eventId,
    enrolled_id: enrolledId,
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Remove fake ID if present
  delete payload.id;

  const { data, error } = await supabase
    .from('mma_staging_checkins')
    .upsert(payload, { onConflict: 'event_id, enrolled_id' })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as StagingCheckin;
}
