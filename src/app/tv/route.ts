import { WAR_ROOM_HTML } from '../operations-board/war-room.generated';

/**
 * The war-room board for a wall display (UAE-23).
 *
 * Same page as /operations-board, served at an address short enough to type on
 * a TV remote. It cannot use the signed-in session — nobody logs into a TV — so
 * the page reads from /api/public/war-room with a PIN entered once per screen.
 *
 * Deliberately noindex: the board shows Blood Test status against named
 * athletes, and a short address is guessable by design.
 */
export async function GET() {
  return new Response(WAR_ROOM_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
