/**
 * Walk-out song link helpers (UAE-20).
 *
 * People paste links straight from a phone, so they arrive in every shape:
 * "youtube.com/watch?v=X", "www.youtu.be/X", "https://...&themeRefresh=1".
 */

/**
 * Makes a pasted link safe to put in href.
 *
 * A link without a scheme ("youtube.com/...") is a RELATIVE url: the browser
 * resolves it against our own origin and sends people to
 * uaewhloapp.vercel.app/youtube.com/... — so assume https when it's missing.
 * Returns null when there's nothing usable.
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The YouTube video id, or null when the link isn't a YouTube video. */
export function youtubeVideoId(raw: string | null | undefined): string | null {
  const normalized = normalizeUrl(raw);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const embed = url.pathname.match(/^\/(?:embed|shorts|v)\/([^/?]+)/);
      if (embed) return embed[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function isYouTubeLink(raw: string | null | undefined): boolean {
  return youtubeVideoId(raw) !== null;
}

/**
 * Filename the audio crew expects: F01_Red_AsafChurapov_Song01.mp3 (UAE-20).
 *
 * Sorting by name has to sort by running order, so the bout number leads and is
 * zero-padded. Unknown order becomes F00 rather than being dropped — a file
 * with no position still has to file somewhere predictable.
 */
export function walkoutFileName(opts: {
  fightOrder: number | null | undefined;
  corner: string | null | undefined;
  athleteName: string;
  slot: 1 | 2 | 3;
}): string {
  const order = `F${String(opts.fightOrder ?? 0).padStart(2, '0')}`;

  const c = (opts.corner || '').toUpperCase();
  const corner = c === 'RED' ? 'Red' : c === 'BLUE' ? 'Blue' : 'NoCorner';

  // Strip the "[C.2] " prefix the ops sheet puts on names, drop accents, and
  // collapse to CamelCase — the crew renames by hand otherwise.
  const athlete =
    opts.athleteName
      .replace(/^\[[^\]]*\]\s*/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'Unknown';

  return `${order}_${corner}_${athlete}_Song0${opts.slot}.mp3`;
}
