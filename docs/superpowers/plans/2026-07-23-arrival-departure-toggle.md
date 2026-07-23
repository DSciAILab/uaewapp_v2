# Public Arrival/Departure Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the public `/public/arrival` page to also serve the Departure List, with an Arrival|Departure toggle synced to `?list=` in the URL.

**Architecture:** Generalize the existing API route to accept `?list=arrival|departure` and fetch the published-to-web CSV (2PACX) for the matching sheet tab, returning a unified row shape with optional per-list fields. The single client page grows tabs, URL sync, conditional columns, departure pick-up emphasis/default sort, and pick-up in WhatsApp messages.

**Tech Stack:** Next.js app router (client page), shadcn/ui (`tabs.tsx` already present), no test framework in repo — verification is `tsc --noEmit` + `curl` against the dev server + browser.

**Spec:** `docs/superpowers/specs/2026-07-23-arrival-departure-toggle-design.md` (approved 23/07).

## Global Constraints

- Data source is the PUBLISHED CSV base (works without link-readable sheet): `https://docs.google.com/spreadsheets/d/e/2PACX-1vQv5hE9bvZ0PqT_Y5PzkL2zMzs2ccU0myXk86z9r3Zk23WrUxxVCnHcufD3FnnvDT_H1-vVsze42tKB/pub?gid=<GID>&single=true&output=csv`
- GIDs: arrival `516640464`, departure `6584257`. Env overrides: `ARRIVAL_SHEET_PUB_BASE`, `ARRIVAL_SHEET_GID`, `DEPARTURE_SHEET_GID`.
- Invalid/missing `?list=` → `arrival` (back-compat).
- Header matching stays prefix-based (`startsWith`) — sheet headers carry annotations like `FLIGHT\n7 / 11`, `PICK-UP DATE AND TIME [22]`.
- Dev server: `cd ~/dev/uaewapp_v2 && node_modules/.bin/next dev -H 0.0.0.0` (NEVER `pnpm dev` — corepack wrapper broken on this Mac).
- Typecheck gate for every task: `node_modules/.bin/tsc --noEmit`.

---

### Task 1: Generalize API route for both lists

**Files:**
- Modify: `src/app/api/public/arrival/route.ts` (whole file below)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `GET /api/public/arrival?list=arrival|departure` → `{ title: string, list: 'arrival'|'departure', rows: TransportRow[], fetchedAt: string }` where

```ts
interface TransportRow {
  order: string; name: string; flight: string;
  flightDate: string; flightTime: string;
  carNumber: string; driver: string;
  airport?: string;       // arrival only
  hotelBooking?: string;  // arrival only
  room?: string;          // departure only
  pickup?: string;        // departure only
}
```

- [ ] **Step 1: Replace route implementation**

Replace the full contents of `src/app/api/public/arrival/route.ts` with:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/dev/uaewapp_v2 && node_modules/.bin/tsc --noEmit`
Expected: no errors (pre-existing errors elsewhere, if any, must be unchanged — compare with `git stash && tsc --noEmit` if unsure).

- [ ] **Step 3: Verify against dev server**

Dev server must be running (`node_modules/.bin/next dev -H 0.0.0.0`).

Run:
```bash
curl -s 'http://localhost:3000/api/public/arrival' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["list"], len(d["rows"]), d["rows"][0])'
curl -s 'http://localhost:3000/api/public/arrival?list=departure' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["list"], len(d["rows"]), d["rows"][0])'
curl -s 'http://localhost:3000/api/public/arrival?list=bogus' | python3 -c 'import json,sys; print(json.load(sys.stdin)["list"])'
```
Expected: line 1 `arrival N {…airport/hotelBooking present, no room/pickup…}`; line 2 `departure N {…room/pickup present…}`; line 3 `arrival` (fallback).

- [ ] **Step 4: Commit**

```bash
cd ~/dev/uaewapp_v2
git add src/app/api/public/arrival/route.ts
git commit -m "feat(public): arrival API serves departure list via ?list= (published CSV source)"
```

---

### Task 2: Page toggle + URL sync + data plumbing

**Files:**
- Modify: `src/app/public/arrival/page.tsx`

**Interfaces:**
- Consumes: Task 1's response `{ title, list, rows: TransportRow[], fetchedAt }` from `/api/public/arrival?list=<kind>`.
- Produces: page state `list: 'arrival' | 'departure'` and `rows: TransportRow[]` that Task 3's rendering reads; helper `setList(kind)` switching tab + URL.

- [ ] **Step 1: Rename row type and add optional fields**

In `page.tsx`, replace the `ArrivalRow` interface (both the type near the top and its duplicate around line 88 — keep ONE definition) with:

```ts
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
type ListKind = 'arrival' | 'departure';
type SortKey = keyof TransportRow;
```

Update every other `ArrivalRow` reference to `TransportRow`. In `matchesSearch`, replace `Object.values(r).join(' ')` with `Object.values(r).filter(Boolean).join(' ')` (optional fields are `undefined`).

- [ ] **Step 2: URL-synced list state + Suspense wrapper**

`useSearchParams` in a client page requires a `<Suspense>` boundary at build time. Restructure the bottom of the file:

```tsx
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function TransportListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const list: ListKind = searchParams.get('list') === 'departure' ? 'departure' : 'arrival';

  const setList = (next: ListKind) => {
    if (next === list) return;
    setLoading(true);
    setRows([]);
    setSortKey(null);
    router.replace(next === 'arrival' ? '/public/arrival' : '/public/arrival?list=departure', { scroll: false });
  };
  // ... existing body ...
}

export default function PublicArrivalPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Loading…</div>}>
      <TransportListPage />
    </Suspense>
  );
}
```

- [ ] **Step 3: Make load() list-aware**

```ts
const load = useCallback(async (manual = false) => {
  if (manual) setRefreshing(true);
  try {
    const res = await fetch(`/api/public/arrival?list=${list}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load');
    setRows(json.rows || []);
    setTitle(json.title || 'UAE Warriors');
    setFetchedAt(json.fetchedAt);
    setError(null);
  } catch (err) {
    setError(err instanceof Error ? err.message : `Failed to load ${list} list`);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [list]);
```

The existing `useEffect` already depends on `[load]`, so switching lists cancels the old 60 s interval and starts a fresh one — no change needed there.

- [ ] **Step 4: Render the tabs**

In the header block, replace the static `<p className="text-lg font-semibold text-muted-foreground">Arrival List</p>` with:

```tsx
<Tabs value={list} onValueChange={(v) => setList(v as ListKind)} className="flex justify-center pt-1">
  <TabsList>
    <TabsTrigger value="arrival">Arrival</TabsTrigger>
    <TabsTrigger value="departure">Departure</TabsTrigger>
  </TabsList>
</Tabs>
```

Derive copy used elsewhere:

```ts
const listLabel = list === 'arrival' ? 'Arrival List' : 'Departure List';
const noun = list === 'arrival' ? 'arrivals' : 'departures';
```

Use `{listLabel}` for the loading text (`Loading {listLabel.toLowerCase()}…`) and `No {noun} match your search.` for both empty states (desktop + mobile).

- [ ] **Step 5: Typecheck + browser check**

Run: `node_modules/.bin/tsc --noEmit` → clean.
Browser: open `http://localhost:3000/public/arrival` — tabs render, switching to Departure updates URL to `?list=departure`, table reloads (departure rows show names from departure tab; columns still arrival-shaped — Task 3 fixes that). Deep link `http://localhost:3000/public/arrival?list=departure` opens on Departure.

- [ ] **Step 6: Commit**

```bash
git add src/app/public/arrival/page.tsx
git commit -m "feat(public): arrival/departure tabs with ?list= URL sync"
```

---

### Task 3: Departure rendering — columns, pick-up emphasis, default sort, WhatsApp

**Files:**
- Modify: `src/app/public/arrival/page.tsx`

**Interfaces:**
- Consumes: `list`, `rows: TransportRow[]`, `sortKey/sortDir` state and `SortableHead` from Task 2.
- Produces: final UI; helper `sortablePickup(v: string): string`.

- [ ] **Step 1: Pick-up sort helper**

Add next to `sortableDate`:

```ts
/**
 * Pick-up cells look like "Fri 24/07 - 02:14". Emit "MM-DD HH:MM" so string
 * compare orders correctly within the event window; anything unparsable is
 * returned as-is (string compare fallback).
 */
function sortablePickup(v: string): string {
  const m = v.match(/(\d{1,2})\/(\d{1,2})\D+(\d{1,2}):(\d{2})/);
  return m
    ? `${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')} ${m[3].padStart(2, '0')}:${m[4]}`
    : v;
}
```

- [ ] **Step 2: Default sort by pick-up on departure**

In `setList` (Task 2) the sort is reset to `null`. Make the sorted-view computation treat departure's default as pick-up ascending:

```ts
const effectiveSortKey: SortKey | null = sortKey ?? (list === 'departure' ? 'pickup' : null);
```

Use `effectiveSortKey` in place of `sortKey` in the sorting block, and extend that block:

```ts
} else if (effectiveSortKey === 'pickup') {
  cmp = sortablePickup(a.pickup || '').localeCompare(sortablePickup(b.pickup || ''));
} else if (effectiveSortKey === 'flightDate') {
```

(Keep `SortableHead`'s active-arrow logic reading `sortKey` — the implicit default shows no arrow until the user clicks, which is fine.)

- [ ] **Step 3: Conditional desktop columns**

Replace the fixed `<TableRow>` header with:

```tsx
<TableRow className="bg-muted/50">
  <SortableHead k="order" label="#" className="w-[50px] text-center" />
  <SortableHead k="name" label="Name" className="min-w-[200px]" />
  {list === 'departure' && <SortableHead k="room" label="Room" />}
  <SortableHead k="flight" label="Flight" />
  <SortableHead k="flightDate" label="Date" />
  <SortableHead k="flightTime" label="Time" />
  {list === 'arrival' && <SortableHead k="airport" label="Airport" />}
  {list === 'arrival' && <SortableHead k="hotelBooking" label="Hotel Booking" />}
  {list === 'departure' && <SortableHead k="pickup" label="Pick-up" />}
  <SortableHead k="carNumber" label="Car Number" />
  <SortableHead k="driver" label="Driver" />
</TableRow>
```

Body cells, same conditionals in the same order (after the flight/date/time cells):

```tsx
{list === 'departure' && (
  <TableCell className="font-mono text-xs">{r.room || '-'}</TableCell>
)}
```
(placed right after the Name cell), and

```tsx
{list === 'arrival' && <TableCell>{r.airport || '-'}</TableCell>}
{list === 'arrival' && <TableCell className="font-mono text-xs">{r.hotelBooking || '-'}</TableCell>}
{list === 'departure' && (
  <TableCell>
    {r.pickup ? (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold tabular-nums whitespace-nowrap" variant="outline">
        {r.pickup}
      </Badge>
    ) : (
      <span className="text-muted-foreground text-xs italic">TBA</span>
    )}
  </TableCell>
)}
```

Empty-state `colSpan` becomes `{list === 'arrival' ? 9 : 9}` — both are 9 columns; leave `colSpan={9}`.

- [ ] **Step 4: Mobile cards — pick-up on top, room in footer**

In the mobile card, directly above the name `<p className="font-bold …">{r.name}</p>` line, add:

```tsx
{list === 'departure' && (
  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
    Pick-up: {r.pickup || 'TBA'}
  </p>
)}
```

In the card footer chips, replace the hotel span with:

```tsx
{list === 'arrival' && r.hotelBooking && (
  <span className="text-[10px] font-mono text-muted-foreground">hotel {r.hotelBooking}</span>
)}
{list === 'departure' && r.room && (
  <span className="text-[10px] font-mono text-muted-foreground">room {r.room}</span>
)}
```

- [ ] **Step 5: WhatsApp messages include pick-up on departure**

`driverMessage` gains the line when present — replace the function:

```ts
function driverMessage(r: TransportRow, driverName: string, eventTitle: string): string {
  return [
    `Hello \`${driverName}\`, I am \`${r.name}\` from ${eventTitle}.`,
    `Flight: ${flightSummary(r) || 'not listed'}`,
    r.pickup && `Pick-up: \`${r.pickup}\``,
    `Car: \`${r.carNumber || 'not assigned'}\``,
  ].filter(Boolean).join('\n');
}
```

In the support-dialog `onClick` message builder, after the `Flight:` line add:

```ts
...(r.pickup ? [`Pick-up: \`${r.pickup}\``] : []),
```

so departure support messages carry pick-up too (arrival rows have no `pickup`, so arrival messages are unchanged).

- [ ] **Step 6: Typecheck + full browser verification**

Run: `node_modules/.bin/tsc --noEmit` → clean.

Browser at `http://localhost:3000/public/arrival?list=departure`:
- Columns: # Name Room Flight Date Time Pick-up Car Driver; pick-up shows amber badge.
- Rows open ordered by pick-up ascending across days (02:14 on 24/07 before 10:00 on 24/07 before anything 25/07).
- Click a driver WhatsApp button → prefilled text contains `Pick-up:` line.
- Support dialog → pick a name → message contains pick-up.
- Narrow window (mobile): card shows amber "Pick-up:" line above the name, "room …" chip in footer.
- Switch back to Arrival: columns/messages exactly as before the change.
- `?list=bogus` → opens Arrival.

- [ ] **Step 7: Commit**

```bash
git add src/app/public/arrival/page.tsx
git commit -m "feat(public): departure columns, pick-up emphasis + default sort, WhatsApp pick-up"
```

---

### Task 4: Push + live check via Tailscale

**Files:** none (ops).

- [ ] **Step 1: Push**

```bash
cd ~/dev/uaewapp_v2 && git push origin main
```

- [ ] **Step 2: Confirm live URLs**

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://100.119.83.37:3000/public/arrival'
curl -s 'http://100.119.83.37:3000/api/public/arrival?list=departure' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["list"], len(d["rows"]))'
```
Expected: `200` and `departure N` (N > 0).

Report both Tailscale links to Fernando:
- Arrival: `http://100.119.83.37:3000/public/arrival`
- Departure: `http://100.119.83.37:3000/public/arrival?list=departure`
