import Papa from 'papaparse';
import { getEventById } from './events';
import { getEventFighterStats } from './stats-service';
import { getEventMatches } from './matches-service';
import { getFighterPhotoUrl, normalizeName } from '@/lib/utils';

/**
 * Fight-card loading, shared by the full page and the quick-look dialog
 * (UAE-20). Kept in one place so the two views can never drift apart.
 *
 * Source of truth is mma_matches; the published CSV is the fallback for
 * events whose card hasn't been synced into the database yet.
 */

const DEFAULT_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8I30mTm8ZyuBttmebz9wv-41TIZ-8HzHiLEYcEhXD2Y5JXCn7AD3aDmOIBpYSp-9tMF7F7obDdQsw/pub?gid=1830739607&single=true&output=csv';

export interface FightCardFighter {
  matchNumber: number;
  event: string;
  corner: 'RED' | 'BLUE';
  division: string;
  name: string;
  nickname: string;
  record: string;
  nationality: string;
  residency: string;
  photoUrl?: string;
  eventValues?: string;
}

export interface FightCardMatch {
  matchNumber: number;
  division: string;
  red?: FightCardFighter;
  blue?: FightCardFighter;
}

export interface FightCardData {
  event: { id: string; name: string; code: string | null } | null;
  matches: FightCardMatch[];
  /** true = came from mma_matches, false = parsed from the published CSV. */
  isFromDB: boolean;
}

export async function loadFightCard(eventId: string): Promise<FightCardData> {
  const [eventData, fightersData, dbMatches] = await Promise.all([
    getEventById(eventId),
    getEventFighterStats(eventId),
    getEventMatches(eventId),
  ]);

  const event = eventData
    ? { id: eventData.id, name: eventData.name, code: eventData.code ?? null }
    : null;

  // --- Preferred: the card already lives in the database ---
  if (dbMatches && dbMatches.length > 0) {
    const toFighter = (
      cornerData: unknown,
      cornerLabel: 'RED' | 'BLUE',
      matchNumber: number,
      division: string
    ): FightCardFighter | undefined => {
      if (!cornerData) return undefined;
      const p = (cornerData as { person?: Record<string, unknown> }).person as
        | Record<string, unknown>
        | undefined;
      const statsArray = p?.stats as Record<string, unknown>[] | undefined;
      const st = Array.isArray(statsArray) && statsArray.length > 0 ? statsArray[0] : null;

      const record = st
        ? `${st.wins}-${st.losses}${Number(st.draws) > 0 ? `-${st.draws}` : ''}${
            Number(st.no_contests) > 0 ? ` (${st.no_contests} NC)` : ''
          }`
        : '';

      return {
        matchNumber,
        event: event?.code || '',
        corner: cornerLabel,
        division,
        name: (p?.compiled_name as string) || '',
        nickname: (st?.nickname as string) || '',
        record,
        nationality: (p?.nationality as string) || '',
        residency: (st?.residency as string) || '',
        photoUrl: p ? getFighterPhotoUrl(p.appadmin_fighter_id as string | null) : '',
        eventValues: p ? `${p.event_name ?? ''} ${p.appadmin_fighter_id ?? ''}`.trim() : '',
      };
    };

    const matches: FightCardMatch[] = dbMatches.map((m) => ({
      matchNumber: m.match_number,
      division: m.division || '',
      red: toFighter(m.red_corner, 'RED', m.match_number, m.division || ''),
      blue: toFighter(m.blue_corner, 'BLUE', m.match_number, m.division || ''),
    }));

    return { event, matches, isFromDB: true };
  }

  // --- Fallback: the published CSV ---
  const baseUrl = (eventData as { fight_card_csv_url?: string } | null)?.fight_card_csv_url || DEFAULT_CSV_URL;
  const targetUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

  const csvText = await fetch(targetUrl).then((r) => r.text());
  const { data: rawData } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const rows: FightCardFighter[] = (rawData as Record<string, unknown>[])
    .map((row) => ({
      matchNumber: (row['#'] as number) || 0,
      event: row['EVENT'] as string,
      corner: row['CORNER'] as 'RED' | 'BLUE',
      division: row['DIVISION'] as string,
      name: row['NAME'] as string,
      nickname: row['NICKNAME'] as string,
      record: row['RECORD'] as string,
      nationality: row['NATIONALITY'] as string,
      residency: row['RESIDENCY'] as string,
    }))
    .filter((r) => r.name && r.event?.toString().toUpperCase() === event?.code?.toUpperCase());

  const matchesMap = new Map<number, FightCardMatch>();

  for (const row of rows) {
    if (!row.matchNumber) continue;
    if (!matchesMap.has(row.matchNumber)) {
      matchesMap.set(row.matchNumber, { matchNumber: row.matchNumber, division: row.division });
    }
    const match = matchesMap.get(row.matchNumber)!;

    // The CSV carries no ids, so the photo is matched by name — best effort.
    const fighterStats = fightersData.find((f) => {
      const pName = normalizeName(f.person?.compiled_name || '');
      const eName = normalizeName((f.person as { event_name?: string })?.event_name || '');
      const cName = normalizeName(row.name);
      return (
        pName === cName ||
        eName === cName ||
        pName.includes(cName) ||
        cName.includes(pName) ||
        eName.includes(cName) ||
        cName.includes(eName)
      );
    });

    const person = fighterStats?.person as Record<string, unknown> | undefined;
    const enriched: FightCardFighter = {
      ...row,
      photoUrl: person ? getFighterPhotoUrl(person.appadmin_fighter_id as string | null) : '',
      eventValues: person ? `${person.event_name ?? ''} ${person.appadmin_fighter_id ?? ''}`.trim() : '',
    };

    if (row.corner === 'RED') match.red = enriched;
    else match.blue = enriched;
  }

  const matches = Array.from(matchesMap.values()).sort((a, b) => a.matchNumber - b.matchNumber);
  return { event, matches, isFromDB: false };
}
