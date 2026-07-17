'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeUrl } from '@/lib/utils/song-links';
import type { SongStatus } from '@/types/music';

/** Badge tone per approval status: pending amber, approved green, rejected red. */
const STATUS_BADGE: Record<SongStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400 hover:bg-amber-500/25',
  approved: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400 hover:bg-emerald-500/25',
  rejected: 'bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-400 hover:bg-red-500/25',
};

const STATUS_DOT: Record<SongStatus, string> = {
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
};

interface WalkoutSongCellProps {
  value: string | null;
  /** Resolved YouTube title; falls back to `label` when absent. */
  title?: string | null;
  label: string;
  status: SongStatus;
  onSave: (value: string) => Promise<void> | void;
}

/**
 * Inline song cell (UAE-20).
 *
 * Empty: free input, saves on blur.
 * Filled: LOCKED — a status-coloured badge carrying the song title, linking to
 * the track. Changing the link needs an explicit pencil click.
 *
 * Read-only for approval on purpose: the colour already says the status, and
 * approving happens card-by-card on the athlete page.
 */
export function WalkoutSongCell({ value, title, label, status, onSave }: WalkoutSongCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const commit = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next === (value ?? '')) return;
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  const href = normalizeUrl(value);
  const locked = !!value && !editing;

  if (locked) {
    return (
      <div className="flex items-center gap-1 min-w-[150px]">
          <a
            href={href ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            title={title || value || undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors max-w-[170px]',
              STATUS_BADGE[status]
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
            <span className="truncate">{title || label}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            title={`Edit ${label}`}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
      </div>
    );
  }

  return (
    <Input
      autoFocus={editing}
      disabled={saving}
      value={draft}
      placeholder="Paste link"
      className="h-7 min-w-[110px] text-xs"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value ?? '');
          setEditing(false);
        }
      }}
    />
  );
}

interface WalkoutNotesCellProps {
  value: string | null;
  onSave: (value: string) => Promise<void> | void;
}

/** Notes cell: always editable, saves on blur (no lock). */
export function WalkoutNotesCell({ value, onSave }: WalkoutNotesCellProps) {
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  return (
    <Input
      disabled={saving}
      value={draft}
      placeholder="Notes"
      className="h-7 min-w-[110px] text-xs"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={async () => {
        const next = draft.trim();
        if (next === (value ?? '')) return;
        setSaving(true);
        try {
          await onSave(next);
        } finally {
          setSaving(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
