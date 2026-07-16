import { createClient } from '@/lib/supabase/server';

/**
 * Resolve the id of the event to treat as "current".
 *
 * UAEW routinely runs more than one event with status='active' at the same
 * time (UAEW70/71 is the documented operating mode). The index pages used to
 * do `.eq('status','active').single()`, which is an error whenever the row
 * count is not exactly 1 — so with two active events every one of those pages
 * silently dead-ended on its empty state instead of redirecting.
 *
 * `.order('event_date', desc).limit(1).maybeSingle()` is the pattern already
 * used by the dashboard: pick the newest active event, and return null (rather
 * than throwing) when there is genuinely none.
 */
export async function getActiveEventId(): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('mma_events')
    .select('id')
    .eq('status', 'active')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[active-event] failed to resolve active event:', error.message);
    return null;
  }

  return data?.id ?? null;
}
