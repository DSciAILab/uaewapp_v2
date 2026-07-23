import { NextRequest, NextResponse } from 'next/server';

// UAE-20: public Arrival/Departure lists. The Google Sheet is the source of
// truth while the app doesn't hold all logistics data, so this proxies the
// sheet's PUBLISHED CSV (2PACX — works without the sheet being link-readable)
// and the public page polls it.
const PUB_BASE =
  process.env.ARRIVAL_SHEET_PUB_BASE ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQv5hE9bvZ0PqT_Y5PzkL2zMzs2ccU0myXk86z9r3Zk23WrUxxVCnHcufD3FnnvDT_H1-vVsze42tKB/pub';
const GIDS = {
  arrival: process.env.ARRIVAL_SHEET_GID || '516640464',
  departure: process.env.DEPARTURE_SHEET_GID || '6584257',
} as const;

export const dynamic = 'force-dynamic';

type ListKind = keyof typeof GIDS;

interface TransportRow {
  order: string;
  name: string;
  flight: string;
  flightDate: string;
  flightTime: string;
  carNumber: string;
  driver: string;
  airport?: string;       // arrival only
  hotelBooking?: string;  // arrival only
  room?: string;          // departure only
  pickup?: string;        // departure only
}

/** Minimal CSV parser that handles quoted fields with commas/newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function GET(req: NextRequest) {
  const listParam = req.nextUrl.searchParams.get('list');
  const list: ListKind = listParam === 'departure' ? 'departure' : 'arrival';
  try {
    const url = `${PUB_BASE}?gid=${GIDS[list]}&single=true&output=csv`;
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Sheet fetch failed (${res.status}) — is the sheet published to the web?` },
        { status: 502 }
      );
    }
    const rows = parseCSV(await res.text());

    // Header row: the one whose cells include '#' and 'NAME'.
    const headerIdx = rows.findIndex(
      (r) => r.some((c) => c.trim() === '#') && r.some((c) => c.trim().toUpperCase().startsWith('NAME'))
    );
    if (headerIdx === -1) {
      return NextResponse.json({ error: 'Header row not found in sheet' }, { status: 502 });
    }
    // Headers carry annotations ("FLIGHT\n7 / 11", "PICK-UP DATE AND TIME [22]")
    // so matching is prefix-based on the first line's uppercased text.
    const header = rows[headerIdx].map((c) => c.trim().toUpperCase());
    const col = (label: string) => header.findIndex((h) => h.startsWith(label));
    const idx = {
      order: header.findIndex((h) => h === '#'),
      name: col('NAME'),
      flight: header.findIndex((h) => h.startsWith('FLIGHT') && !h.includes('DATE') && !h.includes('TIME') && !h.includes('AIRPORT')),
      flightDate: col('FLIGHT DATE'),
      flightTime: col('FLIGHT TIME'),
      airport: col('FLIGHT AIRPORT'),
      hotelBooking: col('HOTEL BOOKING'),
      room: col('ROOM'),
      pickup: col('PICK-UP'),
      carNumber: col('CAR NUMBER'),
      driver: col('DRIVER'),
    };
    const cell = (r: string[], i: number) => (i === -1 ? '' : (r[i] || '').trim());

    const data: TransportRow[] = [];
    for (const r of rows.slice(headerIdx + 1)) {
      const name = cell(r, idx.name);
      if (!name) continue;
      const row: TransportRow = {
        order: cell(r, idx.order),
        name,
        flight: cell(r, idx.flight),
        flightDate: cell(r, idx.flightDate),
        flightTime: cell(r, idx.flightTime),
        carNumber: cell(r, idx.carNumber),
        driver: cell(r, idx.driver),
      };
      if (list === 'arrival') {
        row.airport = cell(r, idx.airport);
        row.hotelBooking = cell(r, idx.hotelBooking);
      } else {
        row.room = cell(r, idx.room);
        row.pickup = cell(r, idx.pickup);
      }
      data.push(row);
    }

    // Event title: first non-empty cell mentioning 'UAE Warriors', if any.
    const title =
      rows.slice(0, headerIdx).flat().map((c) => c.trim()).find((c) => /uae warriors/i.test(c)) || 'UAE Warriors';

    return NextResponse.json({ title, list, rows: data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error(`[${list}] fetch failed:`, err);
    return NextResponse.json({ error: `Failed to load ${list} list` }, { status: 500 });
  }
}
