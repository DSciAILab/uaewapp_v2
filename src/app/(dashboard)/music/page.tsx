'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Music, XCircle, History,
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { MusicStatusBadge } from '@/components/music/music-status-badge';
import { EntranceMusic, MusicStatus, SongStatus } from '@/types/music';
import {
  getAllActiveEventsMusic,
  getActiveEventsFighters,
  createAthleteMusic,
  updateAthleteMusic,
  logMusicChange,
  getMusicHistory,
} from '@/lib/services/music-service';
import { MusicHistoryDrawer } from '@/components/music/music-history-drawer';
import { WalkoutSongCell, WalkoutNotesCell } from '@/components/music/walkout-song-cell';
import { MedicalWhatsAppLink } from '@/components/medical/medical-whatsapp-link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getFighterPhotoUrl } from '@/lib/utils';
import { CSVImportDropdown, downloadCSVTemplate } from '@/components/shared/csv-import-dropdown';
import { MusicBulkDownload } from '@/components/music/music-bulk-download';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FighterMusicRow {
  enrollment_id: string;
  event_id: string;
  event_name: string;
  person_name: string;
  appadmin_fighter_id: string | null;
  phone: string | null;
  corner: string | null;
  fight_order: number | null;
  music: EntranceMusic | null;
}

// Mirrors the Medical Clearance table: avatar ring tinted by corner.
const AVATAR_BORDER = (corner: string | null) => {
  const c = (corner || '').toLowerCase();
  return c === 'red' ? 'border-red-600' : c === 'blue' ? 'border-blue-600' : 'border-muted';
};

/* ---------- Corner summary panels (Medical Clearance pattern) ---------- */

type PanelTotals = { pending: number; done: number; noMusic: number };

function CornerPanel({ title, totals, variant }: {
  title: string;
  totals: PanelTotals;
  variant: 'red' | 'blue' | 'total';
}) {
  const styles = {
    red: {
      container: 'bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900/40',
      title: 'text-red-700 dark:text-red-400',
    },
    blue: {
      container: 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40',
      title: 'text-blue-700 dark:text-blue-400',
    },
    total: {
      container: 'bg-card border-border',
      title: 'text-foreground',
    },
  }[variant];

  const buckets: { key: keyof PanelTotals; label: string; tone: string }[] = [
    { key: 'noMusic', label: 'No Music', tone: 'text-red-700 dark:text-red-400' },
    { key: 'pending', label: 'Pending', tone: 'text-muted-foreground' },
    { key: 'done', label: 'Done', tone: 'text-emerald-700 dark:text-emerald-400' },
  ];

  const total = totals.pending + totals.done + totals.noMusic;

  return (
    <div className={cn('rounded-lg border p-4 flex flex-col gap-3 transition-colors', styles.container)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-bold uppercase tracking-wider', styles.title)}>{title}</span>
        <span className="text-xs font-medium text-muted-foreground">{total} total</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {buckets.map((b) => (
          <div
            key={b.key}
            className="flex flex-col items-center justify-center rounded-md bg-background/60 dark:bg-background/30 px-2 py-2 border border-border/50"
          >
            <span className={cn('text-2xl font-bold leading-none tabular-nums', b.tone)}>{totals[b.key]}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5 font-medium">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type SortKey = 'order' | 'appadmin_fighter_id' | 'person_name' | 'event_name' | 'corner' | 'status';
type SortDir = 'asc' | 'desc';

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
}

function getStatusOrder(row: FighterMusicRow): number {
  if (!row.music) return 4;
  switch (row.music.status) {
    case 'confirmed': return 0;
    case 'uploaded': return 1;
    case 'pending': return 2;
    case 'not_provided': return 3;
    default: return 5;
  }
}

export default function GlobalMusicPage() {
  const [rows, setRows] = useState<FighterMusicRow[]>([]);
  const [allMusic, setAllMusic] = useState<EntranceMusic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [cornerFilter, setCornerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>('order');
  const [historyOpenFor, setHistoryOpenFor] = useState<FighterMusicRow | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fighters, musicData] = await Promise.all([
        getActiveEventsFighters(),
        getAllActiveEventsMusic(),
      ]);

      setAllMusic(musicData);

      const musicMap = new Map<string, EntranceMusic>();
      musicData.forEach(m => musicMap.set(m.enrolled_id, m));

      const merged: FighterMusicRow[] = fighters.map(f => ({
        enrollment_id: f.enrollment_id,
        event_id: f.event_id,
        event_name: f.event_name,
        person_name: f.person_name,
        appadmin_fighter_id: f.appadmin_fighter_id,
        phone: f.phone,
        corner: f.corner,
        fight_order: f.fight_order,
        music: musicMap.get(f.enrollment_id) || null,
      }));

      setRows(merged);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const events = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => {
      if (!map.has(r.event_id)) map.set(r.event_id, r.event_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rows]);

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = rows.filter(r => {
      if (eventFilter !== 'all' && r.event_id !== eventFilter) return false;
      if (cornerFilter !== 'all' && (r.corner || '').toLowerCase() !== cornerFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'no_music' && r.music !== null) return false;
        if (statusFilter !== 'no_music' && r.music?.status !== statusFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const name = r.person_name.toLowerCase();
        const fid = (r.appadmin_fighter_id || '').toLowerCase();
        if (!name.includes(q) && !fid.includes(q)) return false;
      }
      return true;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'order':
            cmp = (a.fight_order ?? 999) - (b.fight_order ?? 999);
            break;
          case 'appadmin_fighter_id':
            cmp = (a.appadmin_fighter_id || '').localeCompare(b.appadmin_fighter_id || '');
            break;
          case 'person_name':
            cmp = a.person_name.localeCompare(b.person_name);
            break;
          case 'event_name':
            cmp = a.event_name.localeCompare(b.event_name);
            break;
          case 'corner':
            cmp = (a.corner || 'zzz').localeCompare(b.corner || 'zzz');
            break;
          case 'status':
            cmp = getStatusOrder(a) - getStatusOrder(b);
            break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, eventFilter, cornerFilter, statusFilter, search, sortKey, sortDir]);

  // Corner summary (Medical Clearance pattern): a row with no songs counts as
  // No Music; Done means at least one song is approved; anything else Pending.
  const summary = useMemo(() => {
    const empty = (): PanelTotals => ({ pending: 0, done: 0, noMusic: 0 });
    const out = { red: empty(), blue: empty(), total: empty() };
    for (const r of rows) {
      const hasSongs = !!r.music && !!(r.music.source_url || r.music.source_url_2 || r.music.source_url_3);
      const bucket: keyof PanelTotals = !hasSongs ? 'noMusic' : r.music!.status === 'confirmed' ? 'done' : 'pending';
      out.total[bucket]++;
      const c = (r.corner || '').toLowerCase();
      if (c === 'red') out.red[bucket]++;
      else if (c === 'blue') out.blue[bucket]++;
    }
    return out;
  }, [rows]);

  type SongSlot = 1 | 2 | 3 | 'notes';
  const SLOT_FIELDS = { 1: 'source_url', 2: 'source_url_2', 3: 'source_url_3' } as const;
  const SLOT_STATUS = { 1: 'status_1', 2: 'status_2', 3: 'status_3' } as const;

  /** Row status is derived: any approved song makes the row Done. */
  const deriveRowStatus = (statuses: SongStatus[]): MusicStatus =>
    statuses.includes('approved') ? 'confirmed' : 'pending';

  /**
   * Inline cell save (UAE-20 Mod 5). Creates the music row on first fill.
   * Changing a song link resets that slot's approval to pending; every change
   * is written to the walkout change log.
   */
  const handleCellSave = async (row: FighterMusicRow, slot: SongSlot, value: string) => {
    try {
      const m = row.music;
      const patch: Partial<Record<string, string | null>> = {};
      let oldValue: string | null = null;
      let field = 'notes';

      if (slot === 'notes') {
        patch.notes = value || null;
        oldValue = m?.notes ?? null;
      } else {
        patch[SLOT_FIELDS[slot]] = value || null;
        oldValue = (m?.[SLOT_FIELDS[slot]] as string | null) ?? null;
        // New/changed link restarts that song's approval.
        patch[SLOT_STATUS[slot]] = 'pending';
        field = `song_${slot}`;
      }

      if (!m) {
        if (!value) return;
        await createAthleteMusic(row.event_id, {
          enrolled_id: row.enrollment_id,
          source_type: 'url',
          start_time_seconds: 0,
          status: 'pending',
          ...patch,
        });
      } else {
        const statuses: SongStatus[] = [
          slot === 1 ? 'pending' : m.status_1 || 'pending',
          slot === 2 ? 'pending' : m.status_2 || 'pending',
          slot === 3 ? 'pending' : m.status_3 || 'pending',
        ];
        await updateAthleteMusic(m.id, { ...patch, status: deriveRowStatus(statuses) });
      }
      await logMusicChange(row.event_id, row.enrollment_id, field, oldValue, value || null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save song');
    }
  };

  /** Per-song approval (UAE-20): one approved song = row Done. */
  const handleSongStatus = async (row: FighterMusicRow, slot: 1 | 2 | 3, status: SongStatus) => {
    const m = row.music;
    if (!m) return;
    try {
      const statuses: SongStatus[] = [
        slot === 1 ? status : m.status_1 || 'pending',
        slot === 2 ? status : m.status_2 || 'pending',
        slot === 3 ? status : m.status_3 || 'pending',
      ];
      await updateAthleteMusic(m.id, {
        [SLOT_STATUS[slot]]: status,
        status: deriveRowStatus(statuses),
      });
      await logMusicChange(
        row.event_id,
        row.enrollment_id,
        `status_${slot}`,
        m[SLOT_STATUS[slot]] || 'pending',
        status
      );
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save status');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Walk-out Songs</h1>
          <p className="text-muted-foreground">
            All fighters from active events — manage walkout songs
          </p>
        </div>
        <div className="flex gap-2">
          <MusicBulkDownload music={allMusic} eventName="All_Events" />
          <CSVImportDropdown
            onImportClick={() => {}}
            onTemplateDownload={() =>
              downloadCSVTemplate(
                'music_import_template.csv',
                'Fighter ID,Links 1,Links 2,Links 3,Notes\nF001,https://youtube.com/watch?v=abc,,, Walk fast\n'
              )
            }
          />
        </div>
      </div>

      {/* Corner summary (Medical Clearance pattern) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CornerPanel title="Red Corner" totals={summary.red} variant="red" />
        <CornerPanel title="Blue Corner" totals={summary.blue} variant="blue" />
        <CornerPanel title="Total" totals={summary.total} variant="total" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or fighter ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-[220px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {events.map(ev => (
              <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cornerFilter} onValueChange={setCornerFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Corner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Corners</SelectItem>
            <SelectItem value="red">Red</SelectItem>
            <SelectItem value="blue">Blue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="no_music">
              <span className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-status-critical" aria-hidden="true" />
                No Music
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div>
        <div>
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading fighters...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/10 border-dashed">
                  <Music className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="font-medium text-lg">No fighters found</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {rows.length === 0
                      ? 'No active events with enrolled fighters.'
                      : 'Try adjusting your filters.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[60px] text-center bg-yellow-50/50 dark:bg-yellow-500/5">
                          <button
                            className="flex items-center justify-center w-full text-xs font-medium hover:text-primary transition-colors"
                            onClick={() => toggleSort('order')}
                          >
                            #
                            <SortIcon column="order" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="w-[80px] text-center">Photo</TableHead>
                        <TableHead className="w-[280px]">
                          <button
                            className="flex items-center text-xs font-medium hover:text-primary transition-colors"
                            onClick={() => toggleSort('person_name')}
                          >
                            Fighter
                            <SortIcon column="person_name" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="w-[60px] text-center">WA</TableHead>
                        <TableHead>Song 1</TableHead>
                        <TableHead>Song 2</TableHead>
                        <TableHead>Song 3</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-center">
                          <button
                            className="flex items-center text-xs font-medium hover:text-primary transition-colors mx-auto"
                            onClick={() => toggleSort('status')}
                          >
                            Status
                            <SortIcon column="status" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="w-[60px] text-center">Log</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(row => {
                        const m = row.music;
                        return (
                          <TableRow key={row.enrollment_id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="p-2 text-center font-bold text-lg bg-yellow-50/30 text-yellow-700/80 dark:bg-yellow-500/5 dark:text-yellow-400/80">
                              {row.fight_order ?? '-'}
                            </TableCell>

                            <TableCell className="text-center p-2">
                              <div className="flex justify-center">
                                <Avatar className={cn('h-12 w-12 border-4 shadow-sm', AVATAR_BORDER(row.corner))}>
                                  <AvatarImage src={getFighterPhotoUrl(row.appadmin_fighter_id)} className="object-cover" />
                                  <AvatarFallback className="font-bold bg-muted text-muted-foreground">
                                    {row.person_name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-base truncate">{row.person_name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[10px] bg-background/80 text-muted-foreground border-muted-foreground/30 px-1 py-0 h-4"
                                  >
                                    ID: {row.appadmin_fighter_id || 'N/A'}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                    {row.event_name}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <MedicalWhatsAppLink phone={row.phone} />
                              </div>
                            </TableCell>

                            <TableCell onClick={e => e.stopPropagation()}>
                              <WalkoutSongCell
                                value={m?.source_url ?? null}
                                label="Song 1"
                                status={m?.status_1 || 'pending'}
                                onSave={(v) => handleCellSave(row, 1, v)}
                                onStatusChange={(st) => handleSongStatus(row, 1, st)}
                              />
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <WalkoutSongCell
                                value={m?.source_url_2 ?? null}
                                label="Song 2"
                                status={m?.status_2 || 'pending'}
                                onSave={(v) => handleCellSave(row, 2, v)}
                                onStatusChange={(st) => handleSongStatus(row, 2, st)}
                              />
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <WalkoutSongCell
                                value={m?.source_url_3 ?? null}
                                label="Song 3"
                                status={m?.status_3 || 'pending'}
                                onSave={(v) => handleCellSave(row, 3, v)}
                                onStatusChange={(st) => handleSongStatus(row, 3, st)}
                              />
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <WalkoutNotesCell
                                value={m?.notes ?? null}
                                onSave={(v) => handleCellSave(row, 'notes', v)}
                              />
                            </TableCell>

                            <TableCell className="text-center">
                              {m ? (
                                <MusicStatusBadge status={m.status} />
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-dashed text-muted-foreground">
                                  —
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View change history"
                                onClick={() => setHistoryOpenFor(row)}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      <MusicHistoryDrawer
        open={historyOpenFor !== null}
        onOpenChange={(open) => !open && setHistoryOpenFor(null)}
        athleteName={historyOpenFor?.person_name ?? ''}
        fetchHistory={() =>
          historyOpenFor ? getMusicHistory(historyOpenFor.enrollment_id) : Promise.resolve([])
        }
      />
    </div>
  );
}
