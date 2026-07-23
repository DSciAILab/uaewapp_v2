'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDown, ArrowUp, ArrowUpDown, MessageCircle, Plane, RefreshCw, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// UAE-20: public mirror of the ops sheet's Arrival List tab. The sheet is the
// source of truth; data comes through /api/public/arrival and refreshes both
// automatically and on demand.
const COORDINATOR_PHONE = '+971543054140';
const AUTO_REFRESH_MS = 60_000;

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

/** Driver cells come from the sheet as "Name | +phone" (phone optional). */
function parseDriver(raw: string): { name: string; phone: string | null } {
  if (!raw) return { name: '', phone: null };
  const [namePart, ...rest] = raw.split('|');
  const phoneDigits = rest.join('|').replace(/[^\d]/g, '');
  return { name: namePart.trim(), phone: phoneDigits.length >= 7 ? phoneDigits : null };
}

/** One-line flight summary used in both the table and the WhatsApp messages. */
function flightSummary(r: TransportRow): string {
  return [r.flight, r.flightDate && `on ${r.flightDate}`, r.flightTime && `at ${r.flightTime}`, r.airport && `(${r.airport})`]
    .filter(Boolean)
    .join(' ');
}

/**
 * Message the guest sends to their assigned driver. WhatsApp inline monospace
 * is a SINGLE backtick; ``` is a block fence and does not render mid-sentence.
 */
function driverMessage(r: TransportRow, driverName: string, eventTitle: string): string {
  return [
    `Hello \`${driverName}\`, I am \`${r.name}\` from ${eventTitle}.`,
    `Flight: ${flightSummary(r) || 'not listed'}`,
    `Car: \`${r.carNumber || 'not assigned'}\``,
  ].join('\n');
}

/**
 * A row matches when ANY comma-separated term appears in ANY column, so
 * "EK 058, FZ 204" lists both flights and "AUH, 20/07" widens rather than
 * narrows. Reading every value off the row keeps new columns searchable
 * without touching this function.
 */
function matchesSearch(r: TransportRow, query: string): boolean {
  const terms = query
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = Object.values(r).filter(Boolean).join(' ').toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

/**
 * Live status for a flight number. Google's flight card is the target because
 * it answers the only question asked at the airport — delayed, landed, which
 * terminal — and it opens for everyone; the tracker sites gate mobile visitors
 * behind bot checks. Anything that isn't a flight number (the sheet also
 * carries "Resident") gets no link.
 */
function flightTrackingUrl(flight: string): string | null {
  const code = flight.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9]{2}\d{1,4}$/.test(code)
    ? `https://www.google.com/search?q=${encodeURIComponent(`${code} flight status`)}`
    : null;
}

/** dd/mm/yyyy -> sortable yyyy-mm-dd; anything else returned as-is. */
function sortableDate(v: string): string {
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v;
}

function TransportListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const list: ListKind = searchParams.get('list') === 'departure' ? 'departure' : 'arrival';

  const [rows, setRows] = useState<TransportRow[]>([]);
  const [title, setTitle] = useState('UAE Warriors');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSearch, setSupportSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const setList = (next: ListKind) => {
    if (next === list) return;
    setLoading(true);
    setRows([]);
    setSortKey(null);
    router.replace(next === 'arrival' ? '/public/arrival' : '/public/arrival?list=departure', { scroll: false });
  };

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

  useEffect(() => {
    load();
    const id = setInterval(() => load(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  let filtered = search ? rows.filter((r) => matchesSearch(r, search)) : rows;

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortKey === 'order') {
        cmp = (parseInt(a.order, 10) || 0) - (parseInt(b.order, 10) || 0);
      } else if (sortKey === 'flightDate') {
        cmp = sortableDate(a.flightDate).localeCompare(sortableDate(b.flightDate));
      } else {
        // Empty values always sink to the bottom regardless of direction.
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        if (!av && bv) return 1;
        if (av && !bv) return -1;
        cmp = av.localeCompare(bv, undefined, { numeric: true });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const listLabel = list === 'arrival' ? 'Arrival List' : 'Departure List';
  const noun = list === 'arrival' ? 'arrivals' : 'departures';

  const SortableHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center text-xs font-medium hover:text-foreground transition-colors"
        onClick={() => toggleSort(k)}
      >
        {label}
        {sortKey !== k ? (
          <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
        ) : sortDir === 'asc' ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )}
      </button>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <Tabs value={list} onValueChange={(v) => setList(v as ListKind)} className="flex justify-center pt-1">
            <TabsList>
              <TabsTrigger value="arrival">Arrival</TabsTrigger>
              <TabsTrigger value="departure">Departure</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-sm text-muted-foreground">
            Your driver will be assigned up to three hours before your scheduled pick-up time.
          </p>
        </div>

        {/* Coordinator + refresh bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Transport Coordinator (24x7)
            </span>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => { setSupportSearch(''); setSupportOpen(true); }}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              For Support Click Here
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {fetchedAt && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Updated {new Date(fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search any column — comma separates (EK 058, FZ 204)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading {listLabel.toLowerCase()}…</div>
        ) : error ? (
          <div className="rounded-md border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableHead k="order" label="#" className="w-[50px] text-center" />
                  <SortableHead k="name" label="Name" className="min-w-[200px]" />
                  <SortableHead k="flight" label="Flight" />
                  <SortableHead k="flightDate" label="Date" />
                  <SortableHead k="flightTime" label="Time" />
                  <SortableHead k="airport" label="Airport" />
                  <SortableHead k="hotelBooking" label="Hotel Booking" />
                  <SortableHead k="carNumber" label="Car Number" />
                  <SortableHead k="driver" label="Driver" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No {noun} match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r, i) => (
                    <TableRow key={`${r.order}-${r.name}-${i}`} className="hover:bg-muted/30">
                      <TableCell className="text-center font-bold text-muted-foreground">{r.order}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        {(() => {
                          const track = r.flight ? flightTrackingUrl(r.flight) : null;
                          const inner = (
                            <>
                              <Plane className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                              {r.flight || '-'}
                            </>
                          );
                          return track ? (
                            <a
                              href={track}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Track ${r.flight} live`}
                              className="flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
                            >
                              {inner}
                            </a>
                          ) : (
                            <span className="flex items-center gap-1.5">{inner}</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="tabular-nums">{r.flightDate || '-'}</TableCell>
                      <TableCell className="tabular-nums">{r.flightTime || '-'}</TableCell>
                      <TableCell>{r.airport || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.hotelBooking || '-'}</TableCell>
                      <TableCell>
                        {r.carNumber ? (
                          <Badge variant="secondary" className="font-mono text-[11px]">{r.carNumber}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">TBA</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const d = parseDriver(r.driver);
                          if (!d.name) return <span className="text-muted-foreground text-xs italic">TBA</span>;
                          if (!d.phone) return <span className="text-sm">{d.name}</span>;
                          return (
                            <a
                              href={`https://wa.me/${d.phone}?text=${encodeURIComponent(driverMessage(r, d.name, title))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Message ${d.name} on WhatsApp`}
                              className="inline-flex items-center gap-1.5 rounded-full bg-green-600 hover:bg-green-700 px-2.5 py-1 text-xs font-medium text-white transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              {d.name}
                            </a>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card stack */}
          <div className="md:hidden space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
                No {noun} match your search.
              </div>
            ) : (
              filtered.map((r, i) => (
                <div key={`m-${r.order}-${r.name}-${i}`} className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-stretch">
                    <div className="flex items-center justify-center w-10 shrink-0 border-r font-bold text-lg text-muted-foreground">
                      {r.order || '-'}
                    </div>
                    <div className="flex-1 p-3 min-w-0 space-y-1.5">
                      <p className="font-bold text-sm leading-tight">{r.name}</p>
                      {(() => {
                        const track = r.flight ? flightTrackingUrl(r.flight) : null;
                        const line =
                          [r.flight, r.flightDate, r.flightTime, r.airport && `· ${r.airport}`]
                            .filter(Boolean)
                            .join(' ') || 'Flight not listed';
                        return (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Plane className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {track ? (
                              <a
                                href={track}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                {line}
                              </a>
                            ) : (
                              line
                            )}
                          </p>
                        );
                      })()}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {r.carNumber ? (
                          <Badge variant="secondary" className="font-mono text-[10px]">{r.carNumber}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-dashed text-muted-foreground">Car TBA</Badge>
                        )}
                        {(() => {
                          const d = parseDriver(r.driver);
                          if (!d.name) return null;
                          if (!d.phone) return <span className="text-xs text-muted-foreground">driver {d.name}</span>;
                          return (
                            <a
                              href={`https://wa.me/${d.phone}?text=${encodeURIComponent(driverMessage(r, d.name, title))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white"
                            >
                              <MessageCircle className="h-3 w-3" aria-hidden="true" />
                              {d.name}
                            </a>
                          );
                        })()}
                        {r.hotelBooking && (
                          <span className="text-[10px] font-mono text-muted-foreground">hotel {r.hotelBooking}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          </>
        )}

        <p className="pb-6 text-center text-xs text-muted-foreground">
          List refreshes automatically every minute — or tap Refresh.
        </p>

        {/* Support dialog: pick your name, WhatsApp opens with a personalized message */}
        <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Transport Coordinator</DialogTitle>
              <DialogDescription>
                Select your name and WhatsApp will open with your flight and car details filled in.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Type your name..."
                value={supportSearch}
                onChange={(e) => setSupportSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
              {rows
                .filter((r) => r.name.toLowerCase().includes(supportSearch.toLowerCase()))
                .map((r, i) => (
                  <button
                    key={`${r.name}-${i}`}
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      const flight = [r.flight, r.flightDate && `on ${r.flightDate}`, r.flightTime && `at ${r.flightTime}`, r.airport && `(${r.airport})`]
                        .filter(Boolean)
                        .join(' ');
                      // WhatsApp inline monospace is a SINGLE backtick; ``` is a
                      // block fence and does not render mid-sentence.
                      const carPart = r.carNumber
                        ? `Car: \`${r.carNumber}\`${r.driver ? ` — driver ${r.driver}` : ''}`
                        : 'Car: not assigned yet';
                      const msg = [
                        `Hello, I am \`${r.name}\` from ${title}.`,
                        `Flight: ${flight || 'not listed'}`,
                        carPart,
                        '',
                        'I need support.',
                      ].join('\n');
                      window.open(
                        `https://wa.me/${COORDINATOR_PHONE.replace(/[^\d]/g, '')}?text=${encodeURIComponent(msg)}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                      setSupportOpen(false);
                    }}
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[r.flight, r.flightDate, r.carNumber].filter(Boolean).join(' · ') || 'no details yet'}
                    </span>
                  </button>
                ))}
              {rows.filter((r) => r.name.toLowerCase().includes(supportSearch.toLowerCase())).length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No names match.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function PublicArrivalPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground">Loading…</div>}>
      <TransportListPage />
    </Suspense>
  );
}
