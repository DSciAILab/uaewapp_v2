import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getWarRoomTables } from '@/lib/services/dashboard-gviz';
import { getActiveEventId } from '@/lib/services/active-event';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Data for the wall-display board (UAE-23).
 *
 * This route sits outside the session gate, because a TV cannot sign in. That
 * makes the PIN the only thing standing in front of athlete data — including
 * Blood Test status — so it is required, never optional: if TV_BOARD_PIN is not
 * configured the route refuses to serve rather than falling open.
 *
 * Read-only by construction: it returns the same tables as the internal
 * endpoint and exposes no way to write.
 */

function pinMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  // Compare in constant time, but only when the lengths already match —
  // timingSafeEqual throws on a length mismatch.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const expected = process.env.TV_BOARD_PIN;
  if (!expected) {
    // Fail closed: an unset PIN must not mean "no PIN required".
    return NextResponse.json({ error: 'Display board is not configured' }, { status: 503 });
  }

  const supplied = req.nextUrl.searchParams.get('key') || '';
  if (!pinMatches(supplied, expected)) {
    return NextResponse.json({ error: 'Invalid display PIN' }, { status: 401 });
  }

  try {
    const eventId = req.nextUrl.searchParams.get('eventId') || (await getActiveEventId());
    if (!eventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 404 });
    }

    // No user session exists here, so RLS would return nothing: read with the
    // service client. The PIN check above is what authorises this.
    const supabase = await createAdminClient();
    const { fightCard, attendance, eventName } = await getWarRoomTables(eventId, supabase);

    return NextResponse.json(
      { eventName, fightCard, attendance },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
