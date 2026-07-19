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

export interface FightCardSyncResult {
  /** Bouts written from the source. */
  synced: number;
  /** Bouts that were in the database but no longer exist in the source. */
  retired: number;
  /** Anything that went wrong. A non-empty list means the sync did NOT fully apply. */
  problems: string[];
}

/**
 * Downloads the current Google Sheets fight card, matches fighters to enrollments,
 * and UPSERTS the structure into the mma_matches table.
 *
 * Every failure here is REPORTED, never swallowed. This function used to drop
 * write errors into console.warn and return a count the caller announced as a
 * success, so a sync that wrote nothing at all looked identical to one that
 * worked -- which is worse than an error, because it costs the operator the
 * information they came for.
 */
export async function syncFightCardToDatabase(eventId: string): Promise<FightCardSyncResult> {
  const supabase = getClient();
  const problems: string[] = [];

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

  // Build matches from flattened CSV rows, keyed by number AND division.
  //
  // Keying on the number alone silently merged two different bouts that share
  // one number: the second overwrote the first corner by corner, producing a
  // fight that exists nowhere in the source and dropping a real one entirely.
  // The database's unique key is (event_id, match_number), so a duplicated
  // number cannot be stored either way -- but it must be REPORTED rather than
  // resolved by whichever row happened to be last.
  const matchesMap = new Map<string, any>();
  for (const row of csvMatches) {
      if (!row.matchNumber) continue;
      const key = `${row.matchNumber}|${(row.division || '').trim().toLowerCase()}`;
      if (!matchesMap.has(key)) {
          matchesMap.set(key, { matchNumber: row.matchNumber, division: row.division });
      }
      const match = matchesMap.get(key);
      if (row.corner === 'RED') match.red = row;
      else if (row.corner === 'BLUE') match.blue = row;
  }
  const groupedMatches = Array.from(matchesMap.values());

  if (groupedMatches.length === 0) {
      throw new Error('No valid fights found in the spreadsheet.');
  }

  // Refuse to guess when one bout number carries two different fights.
  const byNumber = new Map<number, string[]>();
  for (const m of groupedMatches) {
    const list = byNumber.get(m.matchNumber) || [];
    list.push(m.division || '(no division)');
    byNumber.set(m.matchNumber, list);
  }
  const collisions = [...byNumber.entries()].filter(([, divisions]) => divisions.length > 1);
  if (collisions.length > 0) {
    const detail = collisions
      .map(([number, divisions]) => `bout ${number} (${divisions.join(' / ')})`)
      .join('; ');
    throw new Error(
      `The fight card has one bout number used by more than one fight: ${detail}. ` +
        `Fix the numbering in the spreadsheet and sync again -- syncing now would drop one of them.`
    );
  }

  /**
   * Resolve a card name to an enrollment. The old partial-match fallback took
   * the FIRST substring hit in map order, so a short name could bind to the
   * wrong fighter and look perfectly fine afterwards. Now an ambiguous name
   * resolves to nothing and says so -- an empty corner is visible, a wrong
   * fighter is not.
   */
  const resolveCorner = (rawName: string | undefined, bout: number, corner: string): string | null => {
    const name = normalizeName(rawName || '').toLowerCase();
    if (!name) return null;

    const exact = nameMap.get(name);
    if (exact) return exact;

    const candidates = [...new Set(
      [...nameMap.entries()]
        .filter(([key]) => key.includes(name) || name.includes(key))
        .map(([, id]) => id)
    )];

    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      problems.push(`Bout ${bout} ${corner}: "${rawName}" matches more than one enrolled athlete, left empty.`);
    } else {
      problems.push(`Bout ${bout} ${corner}: "${rawName}" matches no enrolled athlete, left empty.`);
    }
    return null;
  };

  let upsertsCount = 0;

  // 3. Process each match
  for (const csvMatch of groupedMatches) {
    const redEnrollmentId = resolveCorner(csvMatch.red?.name, csvMatch.matchNumber, 'red');
    const blueEnrollmentId = resolveCorner(csvMatch.blue?.name, csvMatch.matchNumber, 'blue');

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
      problems.push(`Bout ${csvMatch.matchNumber} could not be saved: ${upsertError.message}`);
    } else {
      upsertsCount++;
    }
  }

  // 4. Retire bouts the source no longer has.
  //
  // Fernando's rule: a bout with at least one active fighter is still a bout.
  // A bout that has left the card entirely is either replaced or renumbered by
  // the matchmaker, so it must not linger -- that is how a fight with two
  // withdrawn athletes stayed on the board as "scheduled".
  //
  // Marked, not deleted: the record of what was once on the card is worth
  // keeping, and a mistake here stays reversible.
  let retired = 0;
  const liveNumbers = groupedMatches.map((m) => m.matchNumber);
  if (liveNumbers.length > 0) {
    const { data: retiredRows, error: retireError } = await supabase
      .from('mma_matches')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .not('match_number', 'in', `(${liveNumbers.join(',')})`)
      .neq('status', 'cancelled')
      .select('match_number');

    if (retireError) {
      problems.push(`Could not retire bouts missing from the source: ${retireError.message}`);
    } else {
      retired = retiredRows?.length || 0;
    }
  }

  return { synced: upsertsCount, retired, problems };
}
