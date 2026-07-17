'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageCircle, Plane, RefreshCw, Search } from 'lucide-react';

// UAE-20: public mirror of the ops sheet's Arrival List tab. The sheet is the
// source of truth; data comes through /api/public/arrival and refreshes both
// automatically and on demand.
const COORDINATOR_PHONE = '+971543054140';
const AUTO_REFRESH_MS = 60_000;

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

export default function PublicArrivalPage() {
  const [rows, setRows] = useState<ArrivalRow[]>([]);
  const [title, setTitle] = useState('UAE Warriors');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch('/api/public/arrival', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setRows(json.rows || []);
      setTitle(json.title || 'UAE Warriors');
      setFetchedAt(json.fetchedAt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load arrival list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const filtered = search
    ? rows.filter((r) =>
        [r.name, r.flight, r.carNumber, r.airport].some((v) =>
          v.toLowerCase().includes(search.toLowerCase())
        )
      )
    : rows;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 pt-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-lg font-semibold text-muted-foreground">Arrival List</p>
          <p className="text-sm text-muted-foreground">
            Your driver will be assigned up to three hours before your scheduled pick-up time.
          </p>
        </div>

        {/* Coordinator + refresh bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
          <a
            href={`https://wa.me/${COORDINATOR_PHONE.replace(/[^\d]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            Transport Coordinator (24x7) · {COORDINATOR_PHONE}
          </a>
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
            placeholder="Search name, flight, car..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading arrival list…</div>
        ) : error ? (
          <div className="rounded-md border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead>Flight</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Airport</TableHead>
                  <TableHead>Hotel Booking</TableHead>
                  <TableHead>Car Number</TableHead>
                  <TableHead>Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No arrivals match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r, i) => (
                    <TableRow key={`${r.order}-${r.name}-${i}`} className="hover:bg-muted/30">
                      <TableCell className="text-center font-bold text-muted-foreground">{r.order}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          <Plane className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          {r.flight || '-'}
                        </span>
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
                      <TableCell>{r.driver || <span className="text-muted-foreground text-xs italic">TBA</span>}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="pb-6 text-center text-xs text-muted-foreground">
          List refreshes automatically every minute — or tap Refresh.
        </p>
      </div>
    </div>
  );
}
