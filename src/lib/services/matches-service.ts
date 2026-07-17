import { createClient } from '@/lib/supabase/client';
import { getFightCardData } from './stats-service';
import { Match, MatchCornerData } from '@/types/stats';
import { normalizeName } from '@/lib/utils';

function getClient() {
  return createClient();
}

/**
 * Loads the structured matches natively from the database.
 */
export async function getEventMatches(eventId: string): Promise<Match[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_matches')
    .select(`
      *,
      red_corner:mma_enrollments!red_corner_enrollment_id(
        id,
        person:mma_people(
          id, compiled_name, event_name, appadmin_fighter_id, nationality, passport_photo,
          stats:mma_fighter_stats(*)
        )
      ),
      blue_corner:mma_enrollments!blue_corner_enrollment_id(
        id,
        person:mma_people(
          id, compiled_name, event_name, appadmin_fighter_id, nationality, passport_photo,
          stats:mma_fighter_stats(*)
        )
      )
    `)
    .eq('event_id', eventId)
    .order('match_number', { ascending: true });

  if (error) {
    console.error('Error fetching event matches:', error);
    throw new Error('Failed to fetch event matches from database');
  }

  // The joins above return array mapping due to how Supabase structures internal relations sometimes,
  // but if it's a direct foreign key (which it is), it returns an object or null.
  return (data as unknown as Match[]) || [];
}

/**
 * Downloads the current Google Sheets fight card, matches fighters to enrollments,
 * and UPSERTS the structure into the mma_matches table.
 */
export async function syncFightCardToDatabase(eventId: string): Promise<number> {
  const supabase = getClient();
  
  // 1. Fetch from Google Sheets CSV (using existing logic)
  const csvMatches = await getFightCardData(eventId);
  
  if (!csvMatches || csvMatches.length === 0) {
    throw new Error('No fights found in the CSV spreadsheet for this event.');
  }

  // 2. Fetch all fighter enrollments for this event
  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      person:mma_people!inner(id, compiled_name, event_name)
    `)
    .eq('event_id', eventId)
    .eq('status', 'active');

  if (enrollError) {
    throw new Error('Failed to fetch enrolled competitors: ' + enrollError.message);
  }

  // Build a map of name -> enrollmentId
  const nameMap = new Map<string, string>();
  for (const e of (enrollments || [])) {
    const person = e.person;
    if (!person) continue;
    
    // Clean names using normalizeName
    const compiledName = normalizeName(person.compiled_name || '').toLowerCase();
    const eventName = normalizeName(person.event_name || '').toLowerCase();
    
    if (compiledName) nameMap.set(compiledName, e.id);
    if (eventName && eventName !== compiledName) nameMap.set(eventName, e.id);
  }

  // Build matches array from flattened CSV rows
  const matchesMap = new Map<number, any>();
  for (const row of csvMatches) {
      if (!row.matchNumber) continue;
      if (!matchesMap.has(row.matchNumber)) {
          matchesMap.set(row.matchNumber, { matchNumber: row.matchNumber, division: row.division });
      }
      const match = matchesMap.get(row.matchNumber);
      if (row.corner === 'RED') match.red = row;
      else if (row.corner === 'BLUE') match.blue = row;
  }
  const groupedMatches = Array.from(matchesMap.values());

  if (groupedMatches.length === 0) {
      throw new Error('No valid fights found in the spreadsheet.');
  }

  let upsertsCount = 0;

  // 3. Process each match
  for (const csvMatch of groupedMatches) {
    // Red Corner
    const redName = normalizeName(csvMatch.red?.name || '').toLowerCase();
    let redEnrollmentId = redName ? nameMap.get(redName) : null;

    // Fallback: Includes (partial match)
    if (redName && !redEnrollmentId) {
       for (const [key, id] of nameMap.entries()) {
           if (key.includes(redName) || redName.includes(key)) {
               redEnrollmentId = id;
               break;
           }
       }
    }

    // Blue Corner
    const blueName = normalizeName(csvMatch.blue?.name || '').toLowerCase();
    let blueEnrollmentId = blueName ? nameMap.get(blueName) : null;
    
    // Fallback: Includes (partial match)
    if (blueName && !blueEnrollmentId) {
        for (const [key, id] of nameMap.entries()) {
            if (key.includes(blueName) || blueName.includes(key)) {
                blueEnrollmentId = id;
                break;
            }
        }
    }

    // Upsert into mma_matches
    const { error: upsertError } = await supabase
      .from('mma_matches')
      .upsert({
        event_id: eventId,
        match_number: csvMatch.matchNumber,
        division: csvMatch.division || null,
        red_corner_enrollment_id: redEnrollmentId || null,
        blue_corner_enrollment_id: blueEnrollmentId || null,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_id,match_number'
      });

    if (upsertError) {
      console.warn(`Failed to sync fight ${csvMatch.matchNumber}:`, upsertError);
    } else {
      upsertsCount++;
    }
  }

  return upsertsCount;
}
