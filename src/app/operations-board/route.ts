import { WAR_ROOM_HTML } from './war-room.generated';

/**
 * The war-room operations dashboard (UAE-23).
 *
 * Served as the approved hand-written page, byte for byte, rather than a React
 * re-implementation — the design was already signed off and porting it would
 * only risk drifting from it. Its data comes from /api/dashboard/war-room.
 *
 * Access is gated by the app middleware, like every other dashboard route;
 * that is also why the file is not in /public, which would bypass it.
 */
export async function GET() {
  return new Response(WAR_ROOM_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
