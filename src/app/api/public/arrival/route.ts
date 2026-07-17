import { NextResponse } from 'next/server';

// UAE-20: public Arrival List. The Google Sheet is the source of truth while
// the app doesn't hold all logistics data, so this proxies the sheet's CSV
// export and the public page polls it. Requires the sheet to be link-readable.
const SHEET_ID = process.env.ARRIVAL_SHEET_ID || '1Mm1mPKJbEAGSDu_7yXO9p2vijetJRkEOhof8uUSbbjE';
const SHEET_GID = process.env.ARRIVAL_SHEET_GID || '516640464';

export const dynamic = 'force-dynamic';

interface ArrivalRow {
  order: string;
  name: string;
  flight: string;
  flightDate: string;
  flightTime: string;
  airport: string;
  hotelBooking: string;
  carNumber: string;
  driver: string;
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

export async function GET() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Sheet fetch failed (${res.status}) — is the sheet link-readable?` },
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
      carNumber: col('CAR NUMBER'),
      driver: col('DRIVER'),
    };

    const data: ArrivalRow[] = [];
    for (const r of rows.slice(headerIdx + 1)) {
      const name = (r[idx.name] || '').trim();
      if (!name) continue;
      data.push({
        order: (r[idx.order] || '').trim(),
        name,
        flight: (r[idx.flight] || '').trim(),
        flightDate: (r[idx.flightDate] || '').trim(),
        flightTime: (r[idx.flightTime] || '').trim(),
        airport: (r[idx.airport] || '').trim(),
        hotelBooking: (r[idx.hotelBooking] || '').trim(),
        carNumber: (r[idx.carNumber] || '').trim(),
        driver: (r[idx.driver] || '').trim(),
      });
    }

    // Event title: first non-empty cell mentioning 'UAE Warriors', if any.
    const title =
      rows.slice(0, headerIdx).flat().map((c) => c.trim()).find((c) => /uae warriors/i.test(c)) || 'UAE Warriors';

    return NextResponse.json({ title, rows: data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[arrival] fetch failed:', err);
    return NextResponse.json({ error: 'Failed to load arrival list' }, { status: 500 });
  }
}
