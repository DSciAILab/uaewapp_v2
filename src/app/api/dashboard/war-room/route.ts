import { NextRequest, NextResponse } from 'next/server';
import { getWarRoomTables } from '@/lib/services/dashboard-gviz';
import { getActiveEventId } from '@/lib/services/active-event';
import { createClient } from '@/lib/supabase/server';
import { BUILD_VERSION } from '@/lib/build-version';

/**
 * Data source for the war-room dashboard (UAE-23).
 *
 * Returns both tables the screen needs in the gviz shape it already parses,
 * replacing the two Google Sheets it used to read. Access is gated by the
 * app middleware, same as any dashboard route.
 */
export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get('eventId') || (await getActiveEventId());
    if (!eventId) {
      return NextResponse.json({ error: 'No active event' }, { status: 404 });
    }

    // The user's session must ride along: RLS returns nothing to anon.
    const supabase = await createClient();
    const { fightCard, attendance, eventName } = await getWarRoomTables(eventId, supabase);

    return NextResponse.json(
      { eventName, fightCard, attendance, version: BUILD_VERSION },
      // The screen polls; let it get fresh data every time.
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
