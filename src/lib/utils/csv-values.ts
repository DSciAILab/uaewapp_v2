/**
 * Shared coercion for values arriving from a spreadsheet (UAE-20).
 *
 * Lives here because every import screen faces the same three shapes and the
 * Flights screen, which had no parser at all, passed "23/07/2026" straight to
 * Postgres — which read 23 as the month and rejected the whole row.
 */

/** Normalizes a CSV date cell to YYYY-MM-DD, or null when unparseable. */
export function parseCSVDate(value: string): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;

  // DD/MM/YYYY or DD-MM-YYYY (European order)
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split(/[/-]/).map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Excel serial date. Excel's epoch is 1899-12-30, which absorbs its
  // "1900 was a leap year" bug.
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = parseFloat(raw);
    if (!(serial > 0 && serial < 100000)) return null;
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const attempt = new Date(raw);
  return isNaN(attempt.getTime()) ? null : attempt.toISOString().split('T')[0];
}

/** Normalizes a CSV time cell to HH:MM, or null when unparseable. */
export function parseCSVTime(value: string): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (hhmm) {
    let hour = Number(hhmm[1]);
    const minute = Number(hhmm[2]);
    const suffix = hhmm[3]?.toLowerCase();
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  // Excel stores a time as the fraction of a day.
  if (/^0?\.\d+$/.test(raw)) {
    const totalMinutes = Math.round(parseFloat(raw) * 24 * 60);
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return null;
}
