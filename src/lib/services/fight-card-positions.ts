import { createClient } from '@/lib/supabase/client';
import { normalizeName } from '@/lib/utils';
import { getEventById } from './events';
import Papa from 'papaparse';

/**
 * Where an athlete sits on the fight card — corner and bout order (UAE-20).
 *
 * These are NOT columns on mma_enrollments: an enrollment says "this person is
 * coming to this event", not "they fight 3rd in the red corner". The card
 * itself is the source, and every athlete table needs the same answer, so it's
 * resolved in one place instead of being re-derived per screen.
 *
 * Two sources, in order:
 *   1. mma_matches — an EXACT join on enrollment ids. Always preferred.
 *   2. the published CSV — matched by NAME, and only when the card hasn't been
 *      synced to the database yet. Substring name matching is a guess; it is
 *      the fallback precisely because it can be wrong.
 */

export interface FightCardPosition {
  corner: 'RED' | 'BLUE' | null;
  fightOrder: number | null;
  division: string | null;
  /** false when the position came from name-matching the CSV — i.e. a guess. */
  exact: boolean;
}

export interface EnrollmentIdentity {
  enrollmentId: string;
  /** Legal/compiled name. */
  fullName: string;
  /** Ring name ("event_name"), often what the card actually prints. */
  ringName?: string | null;
}

const DEFAULT_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8I30mTm8ZyuBttmebz9wv-41TIZ-8HzHiLEYcEhXD2Y5JXCn7AD3aDmOIBpYSp-9tMF7F7obDdQsw/pub?gid=1830739607&single=true&output=csv';

/**
 * Resolves every athlete's place on the card, keyed by enrollment id.
 *
 * `people` is only consulted for the CSV fallback; pass it whenever the caller
 * already has the roster, so an unsynced event still shows corners.
 */
export async function getFightCardPositions(
  eventId: string,
  people?: EnrollmentIdentity[]
): Promise<Map<string, FightCardPosition>> {
  const positions = new Map<string, FightCardPosition>();
  const supabase = createClient();

  // --- 1. Exact: the card lives in the database ---
  const { data: matches, error } = await supabase
    .from('mma_matches')
    .select('match_number, division, red_corner_enrollment_id, blue_corner_enrollment_id')
    .eq('event_id', eventId);

  if (error) {
    console.warn('[fight-card-positions] mma_matches read failed:', error.message);
  }

  if (matches && matches.length > 0) {
    for (const m of matches) {
      const base = { fightOrder: m.match_number ?? null, division: m.division ?? null, exact: true };
      if (m.red_corner_enrollment_id) {
        positions.set(m.red_corner_enrollment_id, { ...base, corner: 'RED' });
      }
      if (m.blue_corner_enrollment_id) {
        positions.set(m.blue_corner_enrollment_id, { ...base, corner: 'BLUE' });
      }
    }
    return positions;
  }

  // --- 2. Fallback: the published CSV, matched by name ---
  if (!people || people.length === 0) return positions;

  try {
    const event = await getEventById(eventId);
    const baseUrl = (event as { fight_card_csv_url?: string } | null)?.fight_card_csv_url || DEFAULT_CSV_URL;
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    const csvText = await fetch(url).then((r) => r.text());

    const { data: rows } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    const cardRows = (rows as Record<string, unknown>[])
      .map((row) => ({
        matchNumber: (row['#'] as number) || null,
        event: String(row['EVENT'] ?? ''),
        corner: row['CORNER'] as 'RED' | 'BLUE' | undefined,
        division: (row['DIVISION'] as string) ?? null,
        name: String(row['NAME'] ?? ''),
      }))
      .filter((r) => r.name && r.event.toUpperCase() === (event?.code ?? '').toUpperCase());

    for (const person of people) {
      const pName = normalizeName(person.fullName || '');
      const eName = normalizeName(person.ringName || '');

      const hit = cardRows.find((c) => {
        const cName = normalizeName(c.name);
        if (!cName) return false;
        return (
          pName === cName ||
          eName === cName ||
          (cName.length > 3 && pName.includes(cName)) ||
          (pName.length > 3 && cName.includes(pName)) ||
          (cName.length > 3 && eName.includes(cName)) ||
          (eName.length > 3 && cName.includes(eName))
        );
      });

      if (hit) {
        positions.set(person.enrollmentId, {
          corner: hit.corner ?? null,
          fightOrder: hit.matchNumber,
          division: hit.division,
          exact: false,
        });
      }
    }
  } catch (err) {
    console.warn('[fight-card-positions] CSV fallback failed:', err);
  }

  return positions;
}

/** Empty position — an enrolled person who isn't on the card (staff, coaches). */
export const NO_POSITION: FightCardPosition = {
  corner: null,
  fightOrder: null,
  division: null,
  exact: true,
};
