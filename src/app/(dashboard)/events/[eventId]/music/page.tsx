import { redirect } from 'next/navigation';

/**
 * UAE-28: the event-scoped Walk-out Songs screen was a second, older UI for the
 * same job — it never got the WhatsApp column, the per-song statuses or the
 * change log, so anyone landing here saw a stale-looking app and assumed the
 * work had been lost. /music covers every event through its own filter, so this
 * route only forwards; keeping it alive preserves saved links and bookmarks.
 */
export default function LegacyEventMusicPage() {
  redirect('/music');
}
