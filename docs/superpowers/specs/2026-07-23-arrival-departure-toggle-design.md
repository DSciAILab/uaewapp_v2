# Public Arrival/Departure List — Design

Date: 2026-07-23 · Owner: UAEW.AI · Approved by Fernando (Telegram, 23/07)

## Goal

Extend the public transport page `/public/arrival` (UAE-20) to also serve the
Departure List, with a user-facing toggle to pick which list to view.

## Data source

The ops Google Sheet, via its **published-to-web CSV** (works without the sheet
being link-readable — more robust than the direct `/export` endpoint used before):

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vQv5hE9bvZ0PqT_Y5PzkL2zMzs2ccU0myXk86z9r3Zk23WrUxxVCnHcufD3FnnvDT_H1-vVsze42tKB/pub?gid=<GID>&single=true&output=csv
```

| List | Tab | GID |
|---|---|---|
| arrival | "Arrival List" | `516640464` |
| departure | "Departure List" | `6584257` |

Base URL and gids overridable via env: `ARRIVAL_SHEET_PUB_BASE`,
`ARRIVAL_SHEET_GID`, `DEPARTURE_SHEET_GID`. The sheet remains the source of
truth (app transition period — sheet-first).

### Column structures (verified against live tabs 23/07)

- Arrival: `#, NAME, FLIGHT, FLIGHT DATE, FLIGHT TIME, FLIGHT AIRPORT, HOTEL BOOKING, CAR NUMBER, DRIVER`
- Departure: `#, NAME, ROOM, FLIGHT, FLIGHT DATE, FLIGHT TIME, PICK-UP DATE AND TIME, CAR NUMBER, DRIVER`

Header cells may carry trailing annotations (e.g. `FLIGHT\n7 / 11`,
`PICK-UP DATE AND TIME [22]`) — matching stays prefix-based (`startsWith`),
as today.

## API — `/api/public/arrival`

- Accepts `?list=arrival|departure`. Missing/invalid → `arrival` (back-compat;
  existing consumers unaffected).
- Picks gid by list, fetches published CSV, parses with the existing minimal
  CSV parser and header-detection (`#` + `NAME` row).
- Unified row shape with optional fields:

```ts
interface TransportRow {
  order: string; name: string; flight: string;
  flightDate: string; flightTime: string;
  carNumber: string; driver: string;
  airport?: string;       // arrival only
  hotelBooking?: string;  // arrival only
  room?: string;          // departure only
  pickup?: string;        // departure only — "PICK-UP DATE AND TIME"
}
```

- Response: `{ title, list, rows, fetchedAt }` (adds `list` echo).
- Errors unchanged: 502 on sheet fetch failure / header not found, 500 on
  unexpected — same messages, per requested list.

## Page — `/public/arrival`

- **Toggle**: two tabs "Arrival | Departure" below the title. Active list
  synced to URL query `?list=departure` (`useSearchParams` +
  `router.replace`), so a WhatsApp-shared link opens the right list.
  Default = arrival. Switching lists refetches; auto-refresh (60 s) and
  manual Refresh always target the active list.
- **Columns**:
  - Arrival (unchanged): `# · Name · Flight · Date · Time · Airport · Hotel Booking · Car Number · Driver`
  - Departure: `# · Name · Room · Flight · Date · Time · Pick-up · Car Number · Driver`
- **Pick-up emphasis** (approved): bold/badge styling; departure list opens
  pre-sorted by pick-up ascending (user can re-sort). Pick-up values look like
  `Fri 24/07 - 02:14`; sort parses the `dd/mm` + `HH:MM` parts, falls back to
  string compare.
- **Mobile cards**: departure card shows pick-up prominently at the top of the
  card; room replaces the hotel-booking footnote.
- **WhatsApp messages** (driver button + support dialog): include
  `Pick-up: …` line when on the departure list; arrival messages unchanged.
- **Copy**: subtitle "Departure List", empty state "No departures match your
  search."; the driver-assignment notice line is the same on both tabs (it
  exists in both sheet tabs).
- Everything else (search semantics, sorting behavior, flight-tracking links,
  coordinator support dialog, 60 s auto-refresh) is shared and unchanged.

## Out of scope

- No schema/database work (sheet-first transition period).
- No auth — page stays public, as today.
- No changes to internal dashboard pages (flights/transport).

## Testing

- Manual: both tabs load real data; `?list=departure` deep link opens
  departure; toggle refetches; pick-up sort ordering correct across days;
  WhatsApp links contain pick-up on departure; mobile card layout on phone
  width; invalid `?list=x` falls back to arrival.
- `pnpm`-less env: run dev server via `node_modules/.bin/next dev`.
