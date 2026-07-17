'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Pencil } from 'lucide-react';

interface WalkoutSongCellProps {
  value: string | null;
  label: string;
  onSave: (value: string) => Promise<void> | void;
}

/**
 * Inline song-link cell (UAE-20 Mod 5).
 *
 * Empty: free input, saves on blur.
 * Filled: LOCKED — shows the link; changing it requires an explicit click on
 * the pencil, and the cell locks again on blur.
 */
export function WalkoutSongCell({ value, label, onSave }: WalkoutSongCellProps) {
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

  const locked = !!value && !editing;

  if (locked) {
    return (
      <div className="flex items-center gap-1 min-w-[110px]">
        <a
          href={value!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[140px]"
          title={value!}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {label}
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
