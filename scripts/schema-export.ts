/**
 * scripts/schema-export.ts
 *
 * Regenerates ../database_schema_export.txt from the live database by querying
 * information_schema for every `mma_%` table: columns (name + type) and
 * constraints (PK / FK / UNIQUE / CHECK).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (parsed manually — no dotenv dependency).
 *
 * The information_schema is NOT exposed over PostgREST, so this uses an
 * `exec_sql(query text)` RPC helper (a common Supabase convention that runs a
 * read-only SQL string with the service role and returns JSON). If that RPC is
 * absent, run the two SQL statements embedded below manually and paste the
 * result — the query text is the source of truth either way.
 *
 * Run with:  npx tsx scripts/schema-export.ts
 * (Intentionally NOT run as part of the build; it needs network + DB access.)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = join(__dirname, '..', '.env.local')
const OUT_PATH = join(__dirname, '..', 'database_schema_export.txt')

/** Minimal .env parser: KEY=VALUE per line, ignores comments/blank lines. */
function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  let raw = ''
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    throw new Error(`Could not read ${path}`)
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const COLUMNS_SQL = `
  SELECT c.table_name, c.column_name, c.data_type, c.ordinal_position
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name LIKE 'mma_%'
  ORDER BY c.table_name, c.ordinal_position
`.trim()

const CONSTRAINTS_SQL = `
  SELECT tc.table_name, tc.constraint_type, tc.constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_schema = 'public' AND tc.table_name LIKE 'mma_%'
    AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
  ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
`.trim()

interface ColumnRow {
  table_name: string
  column_name: string
  data_type: string
}
interface ConstraintRow {
  table_name: string
  constraint_type: string
  constraint_name: string
}

async function runSql<T>(url: string, serviceKey: string, query: string): Promise<T[]> {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`exec_sql failed (HTTP ${res.status}): ${body}`)
  }
  return (await res.json()) as T[]
}

async function main(): Promise<void> {
  const env = loadEnv(ENV_PATH)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  const columns = await runSql<ColumnRow>(url, serviceKey, COLUMNS_SQL)
  const constraints = await runSql<ConstraintRow>(url, serviceKey, CONSTRAINTS_SQL)

  const lines: string[] = []
  lines.push('table_name\tcolumn_name\tdata_type')
  for (const c of columns) {
    lines.push(`${c.table_name}\t${c.column_name}\t${c.data_type}`)
  }
  lines.push('')
  lines.push('table_name\tconstraint_type\tconstraint_name')
  for (const k of constraints) {
    lines.push(`${k.table_name}\t${k.constraint_type}\t${k.constraint_name}`)
  }
  lines.push('')

  writeFileSync(OUT_PATH, lines.join('\n'), 'utf8')
  console.log(
    `Wrote ${OUT_PATH}: ${columns.length} columns, ${constraints.length} constraints across mma_% tables.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
