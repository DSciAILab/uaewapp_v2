# People Google Sheet Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Sync Google Sheet" button on `/people` that pulls athletes from a public Google Sheets CSV and inserts only new records into `mma_people`, reusing the existing `importPeopleFromCSV` dedup/insert logic.

**Architecture:** Client-side fetch of a public CSV URL (configured via `NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL`), parsed with PapaParse (already a dependency, used in fight-card), transformed into `PersonFormData[]`, and passed to the existing `importPeopleFromCSV` service with `upsertMode=false`. A new `syncPeopleFromGoogleSheet()` wraps the fetch + parse + transform; the page adds a button next to the existing CSV import dropdown.

**Tech Stack:** Next.js 15 App Router (`'use client'`), TypeScript, PapaParse, Supabase client SDK, sonner toasts, shadcn/ui Button.

**Spec:** [docs/superpowers/specs/2026-05-08-people-google-sheet-sync-design.md](../specs/2026-05-08-people-google-sheet-sync-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `.env.example` | Modify | Document the new env var |
| `src/lib/services/people.ts` | Modify | Add `syncPeopleFromGoogleSheet()` and helpers (`parseDDMMYYYY`, `mapSheetRow`) |
| `src/app/(dashboard)/people/page.tsx` | Modify | Add sync button, loading state, handler |

No test files: this project has no test infrastructure visible (no `vitest`, `jest`, or `__tests__` directories were found). Validation is manual via the browser per the spec's "Plano de validação" section.

---

## Task 1: Add env var to `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Read current `.env.example`**

Run: `cat .env.example`

Expected current content:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth (Configurar no Supabase Dashboard)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# URL Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3018
NEXT_PUBLIC_AUTH_CALLBACK_URL=http://localhost:3018/auth/callback

# Production Settings
# NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

- [ ] **Step 2: Append the new env var**

Use the Edit tool to append after the existing content. New trailing block:

```
# People Sync — Google Sheet published as CSV (public URL)
# Format: https://docs.google.com/spreadsheets/d/e/.../pub?gid=...&single=true&output=csv
NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL=
```

- [ ] **Step 3: Add the real URL to `.env.local`** (manual, not committed)

Run: `grep -q "NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL" .env.local && echo "exists" || echo "missing"`

If `missing`, append to `.env.local`:
```
NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vS3MJDKFeeEDL3kFa5zVsPcyCy7eRTZ11siA4bmtBt_4HJotAkaDNJtsMgetv_rzFvO4rKsf9eHqOS-/pub?gid=1272847775&single=true&output=csv
```

`.env.local` is in `.gitignore` — confirm with `git check-ignore .env.local` (expected: `.env.local` echoed back).

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "$(cat <<'EOF'
feat(people): document NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL env var

Adds the public Google Sheet CSV URL placeholder to .env.example
for the upcoming /people sync feature.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add `parseDDMMYYYY` helper to `people.ts`

**Files:**
- Modify: `src/lib/services/people.ts` (top of file, after imports)

- [ ] **Step 1: Read the top of the file to find a good insertion point**

Run via Read tool: `src/lib/services/people.ts` lines 1-10. Confirm structure: imports, `function getClient()`, then services.

- [ ] **Step 2: Insert the helper between `getClient()` and `getPeople()`**

Use Edit tool. Locate:

```ts
function getClient() {
  return createClient();
}

export async function getPeople(filters: PeopleFilters = {}): Promise<PaginatedResponse<Person>> {
```

Replace with:

```ts
function getClient() {
  return createClient();
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD (Postgres date format).
 * Returns null for empty input or invalid format.
 */
function parseDDMMYYYY(s: string | undefined | null): string | null {
  if (!s) return null
  const trimmed = String(s).trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const day = parseInt(dd, 10)
  const month = parseInt(mm, 10)
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  return `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export async function getPeople(filters: PeopleFilters = {}): Promise<PaginatedResponse<Person>> {
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors related to `people.ts` (pre-existing errors elsewhere are tolerated; only confirm no new errors in `people.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/people.ts
git commit -m "$(cat <<'EOF'
feat(people): add parseDDMMYYYY date helper

Helper converts DD/MM/YYYY strings (Google Sheet format) to
YYYY-MM-DD for Postgres date columns. Returns null for empty
or invalid input.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `syncPeopleFromGoogleSheet` function

**Files:**
- Modify: `src/lib/services/people.ts` (add at end of file, after `checkDuplicatePerson`)
- Modify: `src/lib/services/people.ts` (top imports — add Papa)

- [ ] **Step 1: Add PapaParse import at the top**

Use Edit. Locate:

```ts
import { createClient } from '@/lib/supabase/client'
import type { Person, PeopleFilters, PaginatedResponse, PersonFormData } from '@/types/database'
import { normalizeName } from '@/lib/utils'
```

Replace with:

```ts
import { createClient } from '@/lib/supabase/client'
import type { Person, PeopleFilters, PaginatedResponse, PersonFormData } from '@/types/database'
import { normalizeName } from '@/lib/utils'
import Papa from 'papaparse'
```

- [ ] **Step 2: Append the new function at end of file**

Use Edit. Locate the closing of `checkDuplicatePerson` (last function in the file):

```ts
  const { data } = await query
  return (data?.length || 0) > 0
}
```

Append after it:

```ts
  const { data } = await query
  return (data?.length || 0) > 0
}

const SHEET_HEADERS = [
  'NAME',
  'SURNAME',
  'FULL NAME',
  'EVENT NAME',
  'GENDER',
  'PHONE',
  'DOB',
  'NATIONALITY',
  'PASSPORT',
  'EXPIRY DATE',
  'PASSPORT IMAGE',
  'DOCUMENT FOLDER',
  'ID',
] as const

/**
 * Map a parsed Google Sheet row (string→string) to PersonFormData.
 * Empty strings become null. Dates are converted DD/MM/YYYY → YYYY-MM-DD.
 * FULL NAME is intentionally ignored: compiled_name is a STORED generated
 * column in the DB (computed from name).
 */
function mapSheetRow(row: Record<string, string>): PersonFormData {
  const get = (key: string) => {
    const v = row[key]
    return v === undefined || v === null ? '' : String(v).trim()
  }
  const orNull = (v: string) => (v === '' ? null : v)

  return {
    name: get('NAME'),
    surname: orNull(get('SURNAME')),
    event_name: orNull(get('EVENT NAME')),
    fighter_id: orNull(get('ID')),
    gender: orNull(get('GENDER').toLowerCase()),
    phone: orNull(get('PHONE')),
    dob: parseDDMMYYYY(get('DOB')),
    nationality: orNull(get('NATIONALITY')),
    passport_number: orNull(get('PASSPORT')),
    passport_expiry: parseDDMMYYYY(get('EXPIRY DATE')),
    passport_photo: orNull(get('PASSPORT IMAGE')),
    document_folder: orNull(get('DOCUMENT FOLDER')),
  }
}

/**
 * Sync new athletes from the public Google Sheet CSV into mma_people.
 * Insert-only: existing records (matched by name|surname|dob) are skipped,
 * never updated. URL is configured via NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL.
 *
 * Returns the same shape as importPeopleFromCSV.
 */
export async function syncPeopleFromGoogleSheet(): Promise<{
  success: number
  updated: number
  errors: ImportError[]
  duplicates: string[]
}> {
  const url = process.env.NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL não configurada no .env.local')
  }

  // Cache busting (same pattern used in fight-card)
  const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
  const response = await fetch(fetchUrl)
  if (!response.ok) {
    throw new Error(`Não foi possível buscar a planilha (HTTP ${response.status}). Verifique se está pública e a URL está correta.`)
  }
  const csvText = await response.text()

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors && parsed.errors.length > 0) {
    const first = parsed.errors[0]
    throw new Error(`Erro ao processar CSV: ${first.message} (linha ${first.row ?? '?'})`)
  }

  const headers = parsed.meta.fields ?? []
  const missing = SHEET_HEADERS.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    throw new Error(`Coluna(s) ausente(s) na planilha: ${missing.join(', ')}. Headers esperados: ${SHEET_HEADERS.join(', ')}`)
  }

  const rows: PersonFormData[] = (parsed.data || [])
    .map(mapSheetRow)
    .filter((r) => r.name && r.name.trim().length > 0)

  // Reuse the existing importer with upsertMode=false → insert-only behavior.
  // columnMapping helps make error messages reference the original Sheet headers.
  const columnMapping: Record<string, string> = {
    name: 'NAME',
    surname: 'SURNAME',
    event_name: 'EVENT NAME',
    fighter_id: 'ID',
    gender: 'GENDER',
    phone: 'PHONE',
    dob: 'DOB',
    nationality: 'NATIONALITY',
    passport_number: 'PASSPORT',
    passport_expiry: 'EXPIRY DATE',
    passport_photo: 'PASSPORT IMAGE',
    document_folder: 'DOCUMENT FOLDER',
  }

  return await importPeopleFromCSV(rows, undefined, true, columnMapping, false)
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "src/lib/services/people.ts" || echo "no errors in people.ts"`
Expected: `no errors in people.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/people.ts
git commit -m "$(cat <<'EOF'
feat(people): add syncPeopleFromGoogleSheet service

Fetches the public Google Sheet CSV configured in
NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL, parses with PapaParse, validates
the 13 expected headers, maps to PersonFormData (with DD/MM/YYYY
date conversion), and delegates to importPeopleFromCSV with
upsertMode=false — insert-only behavior. Existing athletes
(matched by name|surname|dob) are skipped, never updated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add Sync button to `/people` page

**Files:**
- Modify: `src/app/(dashboard)/people/page.tsx`

- [ ] **Step 1: Add `syncPeopleFromGoogleSheet` to the import block**

Use Edit. Locate (around line 42-50):

```ts
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  bulkDeletePeople,
  getNationalities,
  importPeopleFromCSV,
} from '@/lib/services/people'
```

Replace with:

```ts
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  bulkDeletePeople,
  getNationalities,
  importPeopleFromCSV,
  syncPeopleFromGoogleSheet,
} from '@/lib/services/people'
```

- [ ] **Step 2: Add the `RefreshCw` icon to the lucide-react import**

Use Edit. Locate:

```ts
import { Plus, Upload, Search, X, Users } from 'lucide-react'
```

Replace with:

```ts
import { Plus, Upload, Search, X, Users, RefreshCw } from 'lucide-react'
```

- [ ] **Step 3: Add `syncing` state and handler inside the component**

Use Edit. Locate the existing state declarations block; find:

```ts
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())

  const { canEdit, isAdmin, loading: permissionsLoading } = usePermissions()
```

Replace with:

```ts
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)

  const { canEdit, isAdmin, loading: permissionsLoading } = usePermissions()
```

- [ ] **Step 4: Add the `handleSyncSheet` handler**

Use Edit. Locate:

```ts
  const handleCSVComplete = () => {
    setCsvOpen(false)
    fetchPeople()
    fetchNationalities()
  }
```

Replace with:

```ts
  const handleCSVComplete = () => {
    setCsvOpen(false)
    fetchPeople()
    fetchNationalities()
  }

  const handleSyncSheet = async () => {
    setSyncing(true)
    try {
      const result = await syncPeopleFromGoogleSheet()
      const parts = [`${result.success} novos`]
      if (result.duplicates.length > 0) parts.push(`${result.duplicates.length} já existiam`)
      if (result.errors.length > 0) parts.push(`${result.errors.length} com erro`)
      const summary = parts.join(', ')

      if (result.errors.length > 0) {
        toast.warning(`Sincronização concluída: ${summary}`, {
          description: result.errors.slice(0, 3).map((e) => `${e.fullName}: ${e.message}`).join(' • '),
        })
      } else {
        toast.success(`Sincronização concluída: ${summary}`)
      }
      fetchPeople()
      fetchNationalities()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar com Google Sheet')
    } finally {
      setSyncing(false)
    }
  }
```

- [ ] **Step 5: Add the Sync button to the toolbar**

Use Edit. Locate the toolbar block:

```tsx
              {canEditPeople && (
                <>
                  <CSVImportDropdown
                    onImportClick={() => setCsvOpen(true)}
                    onTemplateDownload={() => downloadCSVTemplate('people_import_template.csv', 'Name,Surname,Date of Birth (YYYY-MM-DD),Gender,Nationality,Phone,Passport Name,Passport Number,Passport Expiry,Fighter ID\nJohn,Doe,1990-01-15,male,USA,+1234567890,JOHN DOE,AB123456,2028-12-31,F001\n')}
                  />
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />Nova Pessoa
                  </Button>
                </>
            )}
```

Replace with:

```tsx
              {canEditPeople && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSyncSheet}
                    disabled={syncing || !process.env.NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL}
                    title={!process.env.NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL ? 'Configure NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL no .env.local' : undefined}
                  >
                    <RefreshCw className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')} />
                    {syncing ? 'Sincronizando...' : 'Sync Google Sheet'}
                  </Button>
                  <CSVImportDropdown
                    onImportClick={() => setCsvOpen(true)}
                    onTemplateDownload={() => downloadCSVTemplate('people_import_template.csv', 'Name,Surname,Date of Birth (YYYY-MM-DD),Gender,Nationality,Phone,Passport Name,Passport Number,Passport Expiry,Fighter ID\nJohn,Doe,1990-01-15,male,USA,+1234567890,JOHN DOE,AB123456,2028-12-31,F001\n')}
                  />
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />Nova Pessoa
                  </Button>
                </>
            )}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "src/app/(dashboard)/people/page.tsx" || echo "no errors in page.tsx"`
Expected: `no errors in page.tsx`

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/people/page.tsx
git commit -m "$(cat <<'EOF'
feat(people): add Sync Google Sheet button to People page

Adds a button next to the existing CSV import dropdown that calls
syncPeopleFromGoogleSheet() and shows a toast with the summary
(new / existing / errors). Button is disabled when the env var
is not configured.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Manual validation in the browser

**Files:** None (manual testing)

This project has no automated test suite, so validation is manual per the spec's "Plano de validação" section.

- [ ] **Step 1: Confirm dev server is running**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/people`
Expected: `307` (redirect to login) or `200`. If connection refused, start the server with `pnpm dev` (background OK).

- [ ] **Step 2: Confirm `.env.local` has the URL**

Run: `grep "NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL" .env.local`
Expected: line with the full URL.

If missing, add per Task 1 Step 3 and **restart the dev server** (Next.js does not hot-reload env vars).

- [ ] **Step 3: Open `/people` and run the happy path**

In the browser:
1. Navigate to `http://localhost:3000/people` (login if needed)
2. Click **"Sync Google Sheet"**
3. Wait for toast

Expected first run (banco com poucos registros): toast verde com "X novos, Y já existiam".
Expected immediately re-clicking: toast verde com "0 novos, X já existiam" (idempotent).

- [ ] **Step 4: Verify data integrity in Supabase Studio**

Open Supabase Studio → `mma_people` table. Pick one of the newly inserted rows (e.g. "Aaron Luke Aby"). Confirm:
- `name` = "Aaron Luke" (normalized via `normalizeName`)
- `surname` = "Aby"
- `compiled_name` = auto-computed by the DB (do not check input — it's STORED generated)
- `event_name` = "Aaron Aby"
- `dob` = `1990-02-07` (DD/MM/YYYY 07/02/1990 converted)
- `gender` = "male" (lowercased)
- `phone`, `nationality`, `passport_number`, `passport_expiry`, `passport_photo`, `document_folder`, `fighter_id` all populated

If any field is wrong/null unexpectedly, stop and inspect the mapping in [src/lib/services/people.ts](../../../src/lib/services/people.ts).

- [ ] **Step 5: Verify update-immunity**

In the Google Sheet, edit ONE field of an existing athlete (e.g. change phone). Wait ~30s for Google to publish.

In the app, click "Sync Google Sheet" again. Expected: toast says "0 novos, X já existiam" — and in Supabase the phone of that athlete is **unchanged**.

If the phone changed in the DB → bug: `upsertMode` is not `false`. Open `syncPeopleFromGoogleSheet` and confirm the last argument to `importPeopleFromCSV` is `false`.

- [ ] **Step 6: Verify error handling — bad URL**

Temporarily edit `.env.local` and break the URL (e.g. add `XXX` at the end). **Restart the dev server.** Click "Sync Google Sheet". Expected: toast vermelho com mensagem clara ("Não foi possível buscar a planilha..." ou "Coluna(s) ausente(s)..."). Page does not crash.

Restore the original URL and restart again.

- [ ] **Step 7: Confirm manual CSV import still works**

In `/people`, click the existing CSV import dropdown → "Importar CSV". Confirm the dialog opens normally (no need to actually import — just verify the existing flow wasn't broken).

- [ ] **Step 8: Final cleanup**

Run: `git status`
Expected: only the design spec, plan, and the 4 task commits in history. No leftover modified files.

---

## Self-Review

**Spec coverage:**
- Botão manual em `/people` → Task 4 ✅
- Função `syncPeopleFromGoogleSheet()` → Task 3 ✅
- Env var `NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL` → Task 1 ✅
- Cache busting `&t=${Date.now()}` → Task 3 Step 2 ✅
- Parse com PapaParse → Task 3 (import + use) ✅
- Validação dos 13 headers → Task 3 Step 2 (`SHEET_HEADERS` const + missing check) ✅
- Conversão DD/MM/YYYY → Task 2 ✅
- Reuso de `importPeopleFromCSV` com `upsertMode=false` → Task 3 Step 2 (last call) ✅
- Toast com summary → Task 4 Step 4 ✅
- Insert-only (FULL NAME ignorado por ser STORED) → Task 3 documentado em comment + mapping não inclui compiled_name ✅
- Loading state com spinner → Task 4 Step 5 (`animate-spin`) ✅
- Disabled quando env vazia → Task 4 Step 5 (`disabled={!process.env...}`) ✅
- Plano de validação completo → Task 5 ✅

**Placeholder scan:** None. All steps include exact code, exact paths, exact commands.

**Type consistency:**
- `parseDDMMYYYY` returns `string | null` — matches `dob: string | null` and `passport_expiry: string | null` in `PersonFormData` ✅
- `mapSheetRow` returns `PersonFormData` — confirmed against [database.ts:219-234](../../../src/types/database.ts#L219-L234) (no `compiled_name` field, intentional) ✅
- `syncPeopleFromGoogleSheet` return shape matches `importPeopleFromCSV` return shape (`{ success, updated, errors, duplicates }`) ✅
- `RefreshCw` and `cn` are already used elsewhere in the codebase (see fight-card page) ✅

No issues found. Plan is ready.
