'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, ExternalLink, History, Music, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getFighterPhotoUrl } from '@/lib/utils';
import { normalizeUrl, youtubeVideoId } from '@/lib/utils/song-links';
import {
  getAthleteMusic,
  updateAthleteMusic,
  logMusicChange,
  getMusicHistory,
} from '@/lib/services/music-service';
import { MusicHistoryDrawer } from '@/components/music/music-history-drawer';
import type { EntranceMusic, MusicStatus, SongStatus } from '@/types/music';

const SLOT_URL = { 1: 'source_url', 2: 'source_url_2', 3: 'source_url_3' } as const;
const SLOT_STATUS = { 1: 'status_1', 2: 'status_2', 3: 'status_3' } as const;
const SLOT_TITLE = { 1: 'title_1', 2: 'title_2', 3: 'title_3' } as const;

const STATUS_TONE: Record<SongStatus, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10',
  approved: 'border-emerald-500/50 bg-emerald-500/10',
  rejected: 'border-red-500/40 bg-red-500/10',
};

const STATUS_LABEL: Record<SongStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

/**
 * Per-athlete walk-out song review (UAE-20).
 *
 * The grid is where songs are COLLECTED; this is where they're APPROVED —
 * one athlete at a time, with the track playable next to the decision.
 */
export default function AthleteMusicPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;

  const [music, setMusic] = useState<EntranceMusic | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAthleteMusic(enrollmentId);
      const row = rows[0] ?? null;
      setMusic(row);
      setNotes(row?.notes ?? '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load songs');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const person = music?.enrolled?.person;

  const slots = useMemo(() => {
    if (!music) return [];
    return ([1, 2, 3] as const).map((slot) => ({
      slot,
      url: (music[SLOT_URL[slot]] as string | null) ?? null,
      title: (music[SLOT_TITLE[slot]] as string | null) ?? null,
      status: ((music[SLOT_STATUS[slot]] as SongStatus) || 'pending') as SongStatus,
    }));
  }, [music]);

  /** Row status is derived: any approved song makes the athlete Done. */
  const setStatus = async (slot: 1 | 2 | 3, status: SongStatus) => {
    if (!music) return;
    try {
      const next: SongStatus[] = ([1, 2, 3] as const).map((s) =>
        s === slot ? status : ((music[SLOT_STATUS[s]] as SongStatus) || 'pending')
      );
      await updateAthleteMusic(music.id, {
        [SLOT_STATUS[slot]]: status,
        status: (next.includes('approved') ? 'confirmed' : 'pending') as MusicStatus,
      });
      await logMusicChange(
        music.event_id,
        enrollmentId,
        `status_${slot}`,
        (music[SLOT_STATUS[slot]] as string) || 'pending',
        status
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save status');
    }
  };

  const saveNotes = async () => {
    if (!music || notes.trim() === (music.notes ?? '')) return;
    try {
      await updateAthleteMusic(music.id, { notes: notes.trim() || null });
      await logMusicChange(music.event_id, enrollmentId, 'notes', music.notes, notes.trim() || null);
      await load();
      toast.success('Notes saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save notes');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading songs…</div>;
  }

  if (!music) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/music')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Walk-out Songs
        </Button>
        <div className="rounded-lg border border-dashed bg-muted/10 p-12 text-center">
          <Music className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-medium">No songs submitted yet</p>
          <p className="text-sm text-muted-foreground">This athlete has no walk-out songs on file.</p>
        </div>
      </div>
    );
  }

  const approvedCount = slots.filter((s) => s.status === 'approved').length;

  return (
    <div className="p-6 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.push('/music')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Walk-out Songs
      </Button>

      {/* Athlete header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border-4 border-muted shadow-sm">
          <AvatarImage src={getFighterPhotoUrl(person?.appadmin_fighter_id ?? null)} className="object-cover" />
          <AvatarFallback className="font-bold bg-muted text-muted-foreground">
            {(person?.compiled_name || '??').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{person?.compiled_name || 'Athlete'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              ID: {person?.appadmin_fighter_id || 'N/A'}
            </Badge>
            <Badge variant={approvedCount > 0 ? 'default' : 'secondary'} className="text-[10px]">
              {approvedCount > 0 ? 'Done' : 'Pending'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
          <History className="mr-2 h-4 w-4" /> Log
        </Button>
      </div>

      {/* Songs */}
      <div className="grid gap-4 md:grid-cols-3">
        {slots.map(({ slot, url, title, status }) => {
          const href = normalizeUrl(url);
          const videoId = youtubeVideoId(url);
          return (
            <Card key={slot} className={cn('border-2 transition-colors', url ? STATUS_TONE[status] : 'border-dashed')}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Song {slot}</span>
                  {url && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[status]}</Badge>}
                </div>

                {!url ? (
                  <p className="py-8 text-center text-sm text-muted-foreground italic">Not submitted</p>
                ) : (
                  <>
                    {videoId ? (
                      <div className="aspect-video overflow-hidden rounded-md border bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={title || `Song ${slot}`}
                          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                        Not a YouTube link — open it to review.
                      </div>
                    )}

                    <a
                      href={href ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                      title={url}
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{title || 'Open link'}</span>
                    </a>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant={status === 'approved' ? 'default' : 'outline'}
                        className={cn('flex-1', status === 'approved' && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                        onClick={() => setStatus(slot, status === 'approved' ? 'pending' : 'approved')}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant={status === 'rejected' ? 'destructive' : 'outline'}
                        className="flex-1"
                        onClick={() => setStatus(slot, status === 'rejected' ? 'pending' : 'rejected')}
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notes */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes about this athlete's walk-out songs..."
            className="min-h-[70px] text-sm"
          />
        </CardContent>
      </Card>

      <MusicHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        athleteName={person?.compiled_name ?? ''}
        fetchHistory={() => getMusicHistory(enrollmentId)}
      />
    </div>
  );
}
