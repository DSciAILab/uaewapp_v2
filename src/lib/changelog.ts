/**
 * User-facing changelog (UAE-20).
 *
 * Curated in operations language, not commit language — the staff reads this,
 * not a dev. One entry per delivery batch, newest first. Keep bullets to what
 * changed for the person using the app.
 */

export interface ChangelogEntry {
  /** ISO date, e.g. "2026-07-17". */
  date: string;
  /** Human version label shown on the badge, e.g. "2026.07.17". */
  version: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-07-17',
    version: '2026.07.17',
    changes: [
      'Walk-out Songs rebuilt: one row per fighter, three song slots, each link approved or rejected on the athlete page.',
      'Song links now show the YouTube title, and you can download any song as an MP3 (from the Mac mini app).',
      'Public Arrival List you can share with athletes, live from the ops sheet, with a "For Support" WhatsApp button.',
      'Fighter Stats: import from the old log is done, nationality picker with flags, print the sheet in landscape, and mark each athlete done on event day.',
      'WhatsApp icon added to the Pre-Departure Check and Walk-out Songs — message an athlete straight from the table.',
      'Flights and other imports now match names even with accents or middle-name differences, and read dates like 23/07/2026 correctly.',
      'Fight Card can be opened from anywhere as a quick pop-up, and headlines the ring name.',
      'Tasks can now span a date range, and the People list has an "Enrolled" filter for the active event.',
      'Only authorized UAEW accounts can sign in; the rest of the app is now in English throughout.',
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0]?.version ?? 'dev';
