'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Music, CheckCircle, Clock, AlertTriangle, Search, ExternalLink,
  Filter, Pencil, Plus, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { MusicForm } from '@/components/music/music-form';
import { MusicPlayer } from '@/components/music/music-player';
import { MusicStatusBadge } from '@/components/music/music-status-badge';
import { EntranceMusic } from '@/types/music';
import { getAllActiveEventsMusic, getActiveEventsFighters, formatDuration } from '@/lib/services/music-service';
import { getFighterPhotoUrl } from '@/lib/utils';
import { CSVImportDropdown, downloadCSVTemplate } from '@/components/shared/csv-import-dropdown';
import { MusicBulkDownload } from '@/components/music/music-bulk-download';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FighterMusicRow {
  enrollment_id: string;
  event_id: string;
  event_name: string;
  person_name: string;
  fighter_id: string | null;
  corner: string | null;
  music: EntranceMusic | null;
}

type SortKey = 'fighter_id' | 'person_name' | 'event_name' | 'corner' | 'status';
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
  const [editingMusic, setEditingMusic] = useState<EntranceMusic | null>(null);
  const [previewMusic, setPreviewMusic] = useState<EntranceMusic | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formEventId, setFormEventId] = useState('');
  const [formEnrolledId, setFormEnrolledId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
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
        fighter_id: f.fighter_id,
        corner: f.corner,
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
      if (statusFilter !== 'all') {
        if (statusFilter === 'no_music' && r.music !== null) return false;
        if (statusFilter !== 'no_music' && r.music?.status !== statusFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const name = r.person_name.toLowerCase();
        const fid = (r.fighter_id || '').toLowerCase();
        if (!name.includes(q) && !fid.includes(q)) return false;
      }
      return true;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'fighter_id':
            cmp = (a.fighter_id || '').localeCompare(b.fighter_id || '');
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
  }, [rows, eventFilter, statusFilter, search, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: filtered.length,
    confirmed: filtered.filter(r => r.music?.status === 'confirmed').length,
    pending: filtered.filter(r => r.music?.status === 'pending' || r.music?.status === 'uploaded').length,
    noMusic: filtered.filter(r => !r.music).length,
  }), [filtered]);

  const handleAddMusic = (row: FighterMusicRow) => {
    setEditingMusic(null);
    setFormEventId(row.event_id);
    setFormEnrolledId(row.enrollment_id);
    setIsFormOpen(true);
  };

  const handleEditMusic = (row: FighterMusicRow) => {
    if (row.music) {
      setEditingMusic(row.music);
      setFormEventId(row.event_id);
      setFormEnrolledId('');
      setIsFormOpen(true);
    } else {
      handleAddMusic(row);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMusic(null);
    setFormEventId('');
    setFormEnrolledId('');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entrance Music</h1>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fighters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.confirmed}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending / Uploaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Music</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{stats.noMusic}</span>
            </div>
          </CardContent>
        </Card>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="no_music">❌ No Music</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                        <TableHead className="w-[50px]">Foto</TableHead>
                        <TableHead className="w-[80px]">
                          <button
                            className="flex items-center text-xs font-medium hover:text-primary transition-colors"
                            onClick={() => toggleSort('fighter_id')}
                          >
                            ID
                            <SortIcon column="fighter_id" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center text-xs font-medium hover:text-primary transition-colors"
                            onClick={() => toggleSort('person_name')}
                          >
                            Fighter
                            <SortIcon column="person_name" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center text-xs font-medium hover:text-primary transition-colors"
                            onClick={() => toggleSort('event_name')}
                          >
                            Evento
                            <SortIcon column="event_name" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="text-center">
                          <button
                            className="flex items-center text-xs font-medium hover:text-primary transition-colors mx-auto"
                            onClick={() => toggleSort('corner')}
                          >
                            Corner
                            <SortIcon column="corner" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead>Music</TableHead>
                        <TableHead className="text-center">
                          <button
                            className="flex items-center text-xs font-medium hover:text-primary transition-colors mx-auto"
                            onClick={() => toggleSort('status')}
                          >
                            Status
                            <SortIcon column="status" sortKey={sortKey} sortDir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead className="w-[80px] text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(row => {
                        const m = row.music;
                        return (
                          <TableRow
                            key={row.enrollment_id}
                            className="hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleEditMusic(row)}
                          >
                            <TableCell>
                              <Avatar className="h-9 w-9 border border-muted shadow-sm">
                                <AvatarImage src={getFighterPhotoUrl(row.fighter_id)} />
                                <AvatarFallback className="text-xs font-bold bg-muted/50">
                                  {row.person_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono text-[10px] bg-background">
                                {row.fighter_id || '-'}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <span className="font-bold text-sm">{row.person_name}</span>
                            </TableCell>

                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {row.event_name}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                              {row.corner ? (
                                <Badge
                                  className={`text-[10px] px-2 py-0 h-5 border-none shadow-sm uppercase min-w-[50px] justify-center ${
                                    row.corner.toLowerCase() === 'red'
                                      ? 'bg-red-500 hover:bg-red-600 text-white'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                >
                                  {row.corner}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>

                            <TableCell onClick={e => e.stopPropagation()}>
                              {m ? (
                                <div className="flex flex-col gap-0.5 min-w-[120px]">
                                  {m.source_url && (
                                    <a href={m.source_url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                      <ExternalLink className="h-3 w-3" /> Link 1
                                      <Badge variant="secondary" className="text-[9px] py-0 h-3.5 ml-auto">
                                        {formatDuration(m.start_time_seconds)}
                                      </Badge>
                                    </a>
                                  )}
                                  {m.source_url_2 && (
                                    <a href={m.source_url_2} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                      <ExternalLink className="h-3 w-3" /> Link 2
                                    </a>
                                  )}
                                  {m.source_url_3 && (
                                    <a href={m.source_url_3} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                      <ExternalLink className="h-3 w-3" /> Link 3
                                    </a>
                                  )}
                                  {!m.source_url && !m.source_url_2 && !m.source_url_3 && (
                                    <span className="text-xs text-muted-foreground italic">No links</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/60 italic flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                                  Not added
                                </span>
                              )}
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

                            <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                              {m ? (
                                <Button variant="ghost" size="sm" className="h-7 text-xs"
                                  onClick={() => handleEditMusic(row)}>
                                  <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                              ) : (
                                <Button variant="default" size="sm" className="h-7 text-xs"
                                  onClick={() => handleAddMusic(row)}>
                                  <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                              )}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {previewMusic && (
            <MusicPlayer music={previewMusic} onClose={() => setPreviewMusic(null)} />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Walkout Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Music must be confirmed 24h before event.</li>
                <li>• Maximum duration is 60 seconds per fighter.</li>
                <li>• Walkout order is strictly followed.</li>
              </ul>
            </CardContent>
          </Card>

          {events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {events.map(ev => {
                    const evRows = rows.filter(r => r.event_id === ev.id);
                    const withMusic = evRows.filter(r => r.music !== null).length;
                    const confirmed = evRows.filter(r => r.music?.status === 'confirmed').length;
                    return (
                      <div key={ev.id} className="p-2 rounded bg-muted/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{ev.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {evRows.length} fighters
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span>🎵 {withMusic}/{evRows.length} with music</span>
                          <span>✅ {confirmed} confirmed</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Music Form */}
      {formEventId && (
        <MusicForm
          eventId={formEventId}
          music={editingMusic}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSuccess={loadData}
          defaultEnrolledId={formEnrolledId}
        />
      )}
    </div>
  );
}
