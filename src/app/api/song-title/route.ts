import { NextResponse } from 'next/server';
import { youtubeVideoId } from '@/lib/utils/song-links';

/**
 * Resolves a YouTube link to its video title via oEmbed (UAE-20).
 *
 * oEmbed is public and key-less, but it must be called server-side: the
 * browser can't reach it directly (no CORS headers).
 *
 * Best-effort by design — a missing title never blocks saving the link, so
 * every failure returns { title: null } with 200 rather than an error.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url');
  const videoId = youtubeVideoId(raw);
  if (!videoId) return NextResponse.json({ title: null });

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`,
      { signal: AbortSignal.timeout(5000), cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ title: null });
    const data = (await res.json()) as { title?: string };
    return NextResponse.json({ title: data.title || null });
  } catch (err) {
    console.warn('[song-title] oEmbed lookup failed:', err);
    return NextResponse.json({ title: null });
  }
}
