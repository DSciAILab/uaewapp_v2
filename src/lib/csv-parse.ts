/**
 * Shared CSV parsing for every import wizard in the app.
 *
 * Single source of truth — previously this logic was copy-pasted into
 * shared/generic-csv-import, forms/csv-import and flights/flight-csv-import.
 */

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

/** Prefix used to name columns whose header cell is empty. */
export const PLACEHOLDER_HEADER_PREFIX = 'Coluna_'

const DEFAULT_CANDIDATES = [',', ';', '\t', '|'] as const

/** How many lines (header included) are sampled to detect the delimiter. */
const DELIMITER_SAMPLE_SIZE = 5

/**
 * Quote-aware field splitter. Handles quoted fields containing the delimiter
 * and escaped quotes (`""`).
 */
export function getFields(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' && inQuotes && line[i + 1] === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

/**
 * Picks the delimiter by sampling the first few lines with the quote-aware
 * splitter and preferring the candidate that yields the most *consistent*
 * field count across those lines, using the raw field count only as a
 * tie-breaker.
 *
 * The previous implementation only looked at line 0 and split it with a
 * quote-unaware `String.split`, so a header like `"Last, First",Email` scored
 * `,` = 3 fields and could lose to — or be beaten by — a delimiter that merely
 * appears inside quoted text. Sampling several lines makes the real column
 * separator win, because only it produces a stable column count per row.
 */
export function detectDelimiter(
  lines: string[],
  candidates: readonly string[] = DEFAULT_CANDIDATES
): string {
  const sample = lines.slice(0, DELIMITER_SAMPLE_SIZE)
  if (sample.length === 0) return candidates[0]

  let best = candidates[0]
  let bestScore = -1

  for (const candidate of candidates) {
    const counts = sample.map(line => getFields(line, candidate).length)
    const headerCount = counts[0]

    // A delimiter that does not actually split the header is not a delimiter.
    if (headerCount < 2) continue

    const consistent = counts.filter(c => c === headerCount).length

    // Consistency dominates; field count only breaks ties.
    const score = consistent * 1000 + headerCount
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}

/**
 * Builds unique, non-empty header names. Empty cells become `Coluna_N`;
 * repeated names get a numeric suffix so rows never collide on a key.
 */
function normalizeHeaders(rawHeaders: string[]): string[] {
  const headers: string[] = []
  const seen: Record<string, number> = {}

  rawHeaders.forEach((raw, index) => {
    let name = raw.trim() || `${PLACEHOLDER_HEADER_PREFIX}${index + 1}`
    if (seen[name]) {
      seen[name]++
      name = `${name}_${seen[name]}`
    } else {
      seen[name] = 1
    }
    headers.push(name)
  })

  return headers
}

/** Parses raw CSV/TSV text into headers + row objects keyed by header name. */
export function parseCSV(text: string): ParsedCSV {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\0/g, '')
  const rawLines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (rawLines.length === 0) return { headers: [], rows: [] }

  const delimiter = detectDelimiter(rawLines)
  const headers = normalizeHeaders(getFields(rawLines[0], delimiter))

  const rows = rawLines.slice(1).map(line => {
    const fields = getFields(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = fields[i] || ''
    })
    return row
  })

  return { headers, rows }
}
