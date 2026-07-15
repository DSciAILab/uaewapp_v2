# Medical Clearance Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone "Medical Clearance" module mirroring the staging module but with a single per-athlete decision (Pending / Cleared by Doctor / Sent to Hospital), available on the dashboard and via a public link, with a corner-grouped summary card and a per-row WhatsApp link.

**Architecture:** New `mma_medical_clearance` table backed by a simple service layer. Internal page at `/events/[eventId]/medical` (auth required) and public page at `/public/medical/[eventId]` (writes go through a Server Action with the service-role key). Realtime sync via Supabase channel. Sidebar entry added under `pre_event`.

**Tech Stack:** Next.js 15 App Router (`'use client'`), TypeScript, Supabase JS SDK + Realtime, shadcn/ui (Table, Select, Avatar, Badge), lucide-react icons, sonner toasts.

**Spec:** [docs/superpowers/specs/2026-05-09-medical-clearance-design.md](../specs/2026-05-09-medical-clearance-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260509000000_create_mma_medical_clearance.sql` | Create | Table + indexes + RLS policies |
| `src/types/medical.ts` | Create | Types: `MedicalStatus`, `MedicalClearance`, `MedicalRow`, `MedicalSummary` |
| `src/lib/services/medical-service.ts` | Create | `getMedicalData`, `updateMedicalStatus`, `computeMedicalSummary` |
| `src/lib/actions/public-medical.ts` | Create | Server Action `getPublicMedicalData`, `updateMedicalStatusPublic` (service-role) |
| `src/components/medical/medical-status-cell.tsx` | Create | Dropdown shadcn `Select` with 3 colored options |
| `src/components/medical/medical-whatsapp-link.tsx` | Create | Icon link to `wa.me/<digits>`; renders nothing when phone is null |
| `src/components/medical/medical-summary-card.tsx` | Create | Corner × Status counters card (3×3) |
| `src/components/medical/medical-table.tsx` | Create | Search + corner filter + show filter + table body |
| `src/app/(dashboard)/events/[eventId]/medical/page.tsx` | Create | Internal page |
| `src/app/public/medical/[eventId]/page.tsx` | Create | Public page (no auth) |
| `src/components/layout/sidebar.tsx` | Modify | Add `Medical` nav entry with `area: 'pre_event'` |

No automated tests: this project has no test suite. Validation is manual per Task 11.

Before starting, create a feature branch:

```bash
git checkout -b feature/medical-clearance
```

Stage only files modified by each task — never `git add .` (the working tree has unrelated uncommitted changes).

---

## Task 1: Create database migration

**Files:**
- Create: `supabase/migrations/20260509000000_create_mma_medical_clearance.sql`

- [ ] **Step 1: Confirm migrations directory**

Run: `ls supabase/migrations/ | tail -3`
Expected: includes `20260401080000_create_mma_matches.sql` (most recent migration).

- [ ] **Step 2: Write the migration file**

Use Write tool to create `supabase/migrations/20260509000000_create_mma_medical_clearance.sql`:

```sql
-- Medical clearance per athlete per event
CREATE TABLE IF NOT EXISTS mma_medical_clearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES mma_events(id) ON DELETE CASCADE,
  enrolled_id UUID NOT NULL REFERENCES mma_enrollments(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cleared_by_doctor', 'sent_to_hospital')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (event_id, enrolled_id)
);

CREATE INDEX IF NOT EXISTS idx_medical_event ON mma_medical_clearance(event_id);
CREATE INDEX IF NOT EXISTS idx_medical_status ON mma_medical_clearance(status);

ALTER TABLE mma_medical_clearance ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public route works without login)
CREATE POLICY "medical_select_all" ON mma_medical_clearance
  FOR SELECT USING (true);

-- Authenticated users can write
CREATE POLICY "medical_write_authenticated" ON mma_medical_clearance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public route writes use service-role key, which bypasses RLS by design.
```

- [ ] **Step 3: Apply the migration manually in Supabase Studio**

Open the Supabase project SQL Editor (https://supabase.com/dashboard/project/otqzzllevufcxbpeavmo/sql/new). Paste the SQL above and run it. Confirm "Success. No rows returned".

(Alternative if `supabase` CLI is configured: `supabase db push`. Skip if CLI not set up.)

- [ ] **Step 4: Verify the table exists**

Use the Supabase REST API to confirm:

```bash
SERVICE=$(grep "^SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d= -f2-)
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  "https://otqzzllevufcxbpeavmo.supabase.co/rest/v1/mma_medical_clearance?select=count" \
  -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE"
```

Expected: `HTTP 200`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260509000000_create_mma_medical_clearance.sql
git commit -m "$(cat <<'EOF'
feat(medical): add mma_medical_clearance table migration

Creates the table with FK cascade from mma_events and mma_enrollments,
unique constraint on (event_id, enrolled_id), CHECK constraint on the
3 valid status values, and RLS policies matching the staging pattern
(public read, authenticated write, public route writes via service role).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create types

**Files:**
- Create: `src/types/medical.ts`

- [ ] **Step 1: Write the types file**

Use Write tool to create `src/types/medical.ts`:

```ts
export type MedicalStatus = 'pending' | 'cleared_by_doctor' | 'sent_to_hospital'

export interface MedicalClearance {
  id: string
  event_id: string
  enrolled_id: string
  status: MedicalStatus
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface MedicalRow {
  // null = no row exists yet in mma_medical_clearance
  id: string | null
  enrolled_id: string
  status: MedicalStatus
  corner: 'RED' | 'BLUE' | null
  fight_order: number | null
  person: {
    id: string
    compiled_name: string
    nationality: string | null
    fighter_id: string | null
    phone: string | null
    photo_url: string | null
  }
  event_name: string | null
}

export interface MedicalSummary {
  red: { pending: number; cleared: number; hospital: number }
  blue: { pending: number; cleared: number; hospital: number }
  total: { pending: number; cleared: number; hospital: number }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "src/types/medical.ts" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/types/medical.ts
git commit -m "$(cat <<'EOF'
feat(medical): add medical clearance types

Mirrors the staging type structure: MedicalStatus union, MedicalClearance
DB row, MedicalRow (joined view with person + corner + fight_order),
MedicalSummary (3×3 counters by corner × status).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create the service layer

**Files:**
- Create: `src/lib/services/medical-service.ts`

- [ ] **Step 1: Write the service file**

Use Write to create `src/lib/services/medical-service.ts`:

```ts
import { createClient } from '@/lib/supabase/client'
import type { MedicalClearance, MedicalRow, MedicalStatus, MedicalSummary } from '@/types/medical'
import { getFightCardData } from './stats-service'
import { normalizeName, getFighterPhotoUrl } from '@/lib/utils'

function getClient() {
  return createClient()
}

/**
 * Returns one MedicalRow per athlete (role 'F') enrolled in the event.
 * Athletes without a clearance row appear with id=null and status='pending'.
 * Corner and fight_order come from the fight-card CSV (best-effort match).
 */
export async function getMedicalData(eventId: string): Promise<MedicalRow[]> {
  const supabase = getClient()

  const { data: enrollments, error: enrollErr } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      person:mma_people(id, name, surname, nationality, fighter_id, passport_photo, phone, event_name),
      event:mma_events(name),
      role:mma_roles!inner(code)
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('role.code', 'F')

  if (enrollErr) throw enrollErr
  if (!enrollments || enrollments.length === 0) return []

  const { data: clearances, error: clearErr } = await supabase
    .from('mma_medical_clearance')
    .select('*')
    .eq('event_id', eventId)

  if (clearErr) throw clearErr

  let fightCard: any[] = []
  try {
    fightCard = await getFightCardData()
  } catch (err) {
    console.warn('[medical-service] failed to fetch fight card:', err)
  }

  const clearanceMap = new Map<string, MedicalClearance>()
  ;(clearances || []).forEach((c: MedicalClearance) => clearanceMap.set(c.enrolled_id, c))

  const rows: MedicalRow[] = []

  for (const enr of enrollments as any[]) {
    const person = Array.isArray(enr.person) ? enr.person[0] : enr.person
    if (!person) continue

    const fullName = `${person.name || ''} ${person.surname || ''}`.trim()
    const eventName = person.event_name || ''

    const match =
      fightCard.find((c: any) => {
        const pName = normalizeName(fullName)
        const eName = normalizeName(eventName)
        const cName = normalizeName(c.name || '')
        return (
          pName === cName ||
          eName === cName ||
          (cName.length > 3 && pName.includes(cName)) ||
          (pName.length > 3 && cName.includes(pName)) ||
          (cName.length > 3 && eName.includes(cName)) ||
          (eName.length > 3 && cName.includes(eName))
        )
      }) || { matchNumber: null, corner: null, name: null }

    const existing = clearanceMap.get(enr.id)

    rows.push({
      id: existing?.id ?? null,
      enrolled_id: enr.id,
      status: (existing?.status as MedicalStatus) ?? 'pending',
      corner: (match.corner as 'RED' | 'BLUE' | null) ?? null,
      fight_order: match.matchNumber ?? null,
      person: {
        id: person.id,
        compiled_name: match.name || eventName || fullName,
        nationality: person.nationality ?? null,
        fighter_id: person.fighter_id ?? null,
        phone: person.phone ?? null,
        photo_url: getFighterPhotoUrl(person.fighter_id) || person.passport_photo || null,
      },
      event_name: Array.isArray(enr.event) ? enr.event[0]?.name ?? null : enr.event?.name ?? null,
    })
  }

  return rows.sort((a, b) => (a.fight_order ?? 999) - (b.fight_order ?? 999))
}

/**
 * Upsert a medical clearance row by (event_id, enrolled_id).
 */
export async function updateMedicalStatus(
  eventId: string,
  enrolledId: string,
  status: MedicalStatus
): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase
    .from('mma_medical_clearance')
    .upsert(
      {
        event_id: eventId,
        enrolled_id: enrolledId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,enrolled_id' }
    )

  if (error) throw error
}

/**
 * Pure function — derives the 3×3 summary from an array of rows.
 */
export function computeMedicalSummary(rows: MedicalRow[]): MedicalSummary {
  const blank = () => ({ pending: 0, cleared: 0, hospital: 0 })
  const summary: MedicalSummary = { red: blank(), blue: blank(), total: blank() }

  for (const r of rows) {
    const bucket =
      r.status === 'cleared_by_doctor'
        ? 'cleared'
        : r.status === 'sent_to_hospital'
        ? 'hospital'
        : 'pending'

    summary.total[bucket] += 1
    if (r.corner === 'RED') summary.red[bucket] += 1
    else if (r.corner === 'BLUE') summary.blue[bucket] += 1
  }

  return summary
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "src/lib/services/medical-service.ts" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/medical-service.ts
git commit -m "$(cat <<'EOF'
feat(medical): add medical clearance service

getMedicalData joins enrollments with mma_people (now including phone)
and mma_medical_clearance, enriching with corner/fight_order from the
fight-card CSV. Athletes without a clearance row come back with
id=null and status='pending' (lazy creation).

updateMedicalStatus upserts by (event_id, enrolled_id).

computeMedicalSummary is a pure helper that builds the 3x3 corner x
status counters from the same row array — no second round-trip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create the public Server Action

**Files:**
- Create: `src/lib/actions/public-medical.ts`

- [ ] **Step 1: Read the existing public-staging action for the pattern**

Read `src/lib/actions/public-staging.ts` (already explored — uses `createAdminClient` from `@/lib/supabase/server`, fetches enrollments + checkins + fight card in parallel).

- [ ] **Step 2: Write the action file**

Use Write to create `src/lib/actions/public-medical.ts`:

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { MedicalClearance, MedicalRow, MedicalStatus } from '@/types/medical'
import { getFightCardData } from '@/lib/services/stats-service'
import { normalizeName, getFighterPhotoUrl } from '@/lib/utils'

export async function getPublicMedicalData(eventId: string): Promise<MedicalRow[]> {
  const supabase = await createAdminClient()

  try {
    const [enrollmentRes, clearanceRes, fightCard] = await Promise.all([
      supabase
        .from('mma_enrollments')
        .select(`
          id,
          person:mma_people(id, name, surname, nationality, fighter_id, passport_photo, phone, event_name),
          event:mma_events(name),
          role:mma_roles!inner(code)
        `)
        .eq('event_id', eventId)
        .eq('status', 'active')
        .eq('role.code', 'F'),
      supabase.from('mma_medical_clearance').select('*').eq('event_id', eventId),
      getFightCardData(),
    ])

    if (enrollmentRes.error) console.error('[PublicMedical] enrollment error:', enrollmentRes.error)
    if (clearanceRes.error) console.error('[PublicMedical] clearance error:', clearanceRes.error)

    const enrollments = enrollmentRes.data || []
    const clearances = clearanceRes.data || []

    const clearanceMap = new Map<string, MedicalClearance>()
    clearances.forEach((c: MedicalClearance) => clearanceMap.set(c.enrolled_id, c))

    const rows: MedicalRow[] = []
    for (const enr of enrollments as any[]) {
      const person = Array.isArray(enr.person) ? enr.person[0] : enr.person
      if (!person) continue

      const fullName = `${person.name || ''} ${person.surname || ''}`.trim()
      const eventName = person.event_name || ''

      const match =
        fightCard.find((fight: any) => {
          const cName = normalizeName(fight.name || '')
          const pName = normalizeName(fullName)
          const eName = normalizeName(eventName)
          return (
            pName === cName ||
            eName === cName ||
            (cName.length > 3 && pName.includes(cName)) ||
            (pName.length > 3 && cName.includes(pName)) ||
            (cName.length > 3 && eName.includes(cName)) ||
            (eName.length > 3 && cName.includes(eName))
          )
        }) || { matchNumber: null, corner: null, name: null }

      const existing = clearanceMap.get(enr.id)

      rows.push({
        id: existing?.id ?? null,
        enrolled_id: enr.id,
        status: (existing?.status as MedicalStatus) ?? 'pending',
        corner: (match.corner as 'RED' | 'BLUE' | null) ?? null,
        fight_order: match.matchNumber ?? null,
        person: {
          id: person.id,
          compiled_name: match.name || eventName || fullName,
          nationality: person.nationality ?? null,
          fighter_id: person.fighter_id ?? null,
          phone: person.phone ?? null,
          photo_url: getFighterPhotoUrl(person.fighter_id) || person.passport_photo || null,
        },
        event_name: Array.isArray(enr.event) ? (enr.event[0] as any)?.name ?? null : (enr.event as any)?.name ?? null,
      })
    }

    return rows.sort((a, b) => (a.fight_order ?? 999) - (b.fight_order ?? 999))
  } catch (err) {
    console.error('[PublicMedical] critical error:', err)
    return []
  }
}

const VALID_STATUSES: MedicalStatus[] = ['pending', 'cleared_by_doctor', 'sent_to_hospital']

export async function updateMedicalStatusPublic(
  eventId: string,
  enrolledId: string,
  status: MedicalStatus
): Promise<{ success: boolean; error?: string }> {
  if (!eventId || !enrolledId) {
    return { success: false, error: 'Missing eventId or enrolledId' }
  }
  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: `Invalid status: ${status}` }
  }

  const supabase = await createAdminClient()

  // Sanity check: enrollment must belong to the event (prevents cross-event writes)
  const { data: enr, error: enrErr } = await supabase
    .from('mma_enrollments')
    .select('id, event_id')
    .eq('id', enrolledId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (enrErr) return { success: false, error: enrErr.message }
  if (!enr) return { success: false, error: 'Enrollment not found for this event' }

  const { error } = await supabase
    .from('mma_medical_clearance')
    .upsert(
      {
        event_id: eventId,
        enrolled_id: enrolledId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,enrolled_id' }
    )

  if (error) return { success: false, error: error.message }
  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "src/lib/actions/public-medical.ts" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/public-medical.ts
git commit -m "$(cat <<'EOF'
feat(medical): add public-medical Server Action

getPublicMedicalData mirrors getMedicalData but uses createAdminClient
(service role) so the public route works without login.

updateMedicalStatusPublic validates enrolledId belongs to the event
and the status is in the allowed set, then upserts. Used by the
public route's dropdown so RLS doesn't block writes from anon clients.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create the WhatsApp link component

**Files:**
- Create: `src/components/medical/medical-whatsapp-link.tsx`

- [ ] **Step 1: Write the component**

Use Write to create `src/components/medical/medical-whatsapp-link.tsx`:

```tsx
'use client'

import { MessageCircle } from 'lucide-react'

interface Props {
  phone: string | null | undefined
  className?: string
}

/**
 * Renders a WhatsApp icon link to wa.me/<digits>.
 * Returns null when phone is missing — caller's cell stays empty.
 */
export function MedicalWhatsAppLink({ phone, className }: Props) {
  if (!phone) return null

  const digits = phone.replace(/[^\d]/g, '')
  if (!digits) return null

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`WhatsApp (${phone})`}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      <MessageCircle className="h-4 w-4 text-green-600 hover:text-green-700 transition-colors" />
    </a>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "medical-whatsapp-link" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/components/medical/medical-whatsapp-link.tsx
git commit -m "$(cat <<'EOF'
feat(medical): add WhatsApp link component

Renders a clickable wa.me icon when a phone number is available;
returns null otherwise so the table cell stays empty (per design).
Strips all non-digit characters from the phone before composing
the URL. stopPropagation prevents row-click handlers from firing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create the status dropdown cell

**Files:**
- Create: `src/components/medical/medical-status-cell.tsx`

- [ ] **Step 1: Write the component**

Use Write to create `src/components/medical/medical-status-cell.tsx`:

```tsx
'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MedicalStatus } from '@/types/medical'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<MedicalStatus, string> = {
  pending: 'Pending',
  cleared_by_doctor: 'Cleared by Doctor',
  sent_to_hospital: 'Sent to Hospital',
}

const STATUS_CLASSES: Record<MedicalStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-muted',
  cleared_by_doctor:
    'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900',
  sent_to_hospital:
    'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
}

interface Props {
  value: MedicalStatus
  onChange: (next: MedicalStatus) => void
  disabled?: boolean
}

export function MedicalStatusCell({ value, onChange, disabled }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MedicalStatus)} disabled={disabled}>
      <SelectTrigger className={cn('h-8 min-w-[180px] text-xs font-medium', STATUS_CLASSES[value])}>
        <SelectValue placeholder="Pending" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
        <SelectItem value="cleared_by_doctor">{STATUS_LABELS.cleared_by_doctor}</SelectItem>
        <SelectItem value="sent_to_hospital">{STATUS_LABELS.sent_to_hospital}</SelectItem>
      </SelectContent>
    </Select>
  )
}

export { STATUS_LABELS as MEDICAL_STATUS_LABELS }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "medical-status-cell" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/components/medical/medical-status-cell.tsx
git commit -m "$(cat <<'EOF'
feat(medical): add medical status dropdown cell

shadcn Select with the 3 statuses, color-coded:
pending = neutral, cleared_by_doctor = green, sent_to_hospital = red.
Exports STATUS_LABELS for reuse in the summary card.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create the summary card

**Files:**
- Create: `src/components/medical/medical-summary-card.tsx`

- [ ] **Step 1: Write the component**

Use Write to create `src/components/medical/medical-summary-card.tsx`:

```tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { MedicalSummary } from '@/types/medical'
import { cn } from '@/lib/utils'

interface Props {
  summary: MedicalSummary
}

const ROW_LABELS: Array<{ key: 'pending' | 'cleared' | 'hospital'; label: string; tone: string }> = [
  { key: 'pending', label: 'Pending', tone: 'text-muted-foreground' },
  { key: 'cleared', label: 'Cleared by Doctor', tone: 'text-green-700 dark:text-green-400' },
  { key: 'hospital', label: 'Sent to Hospital', tone: 'text-red-700 dark:text-red-400' },
]

export function MedicalSummaryCard({ summary }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left pb-2 font-medium"></th>
              <th className="text-center pb-2 font-medium text-red-600 dark:text-red-400">Red</th>
              <th className="text-center pb-2 font-medium text-blue-600 dark:text-blue-400">Blue</th>
              <th className="text-center pb-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ROW_LABELS.map((row) => (
              <tr key={row.key} className="border-t">
                <td className={cn('py-2 font-medium', row.tone)}>{row.label}</td>
                <td className="py-2 text-center font-bold">{summary.red[row.key]}</td>
                <td className="py-2 text-center font-bold">{summary.blue[row.key]}</td>
                <td className="py-2 text-center font-bold">{summary.total[row.key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "medical-summary-card" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/components/medical/medical-summary-card.tsx
git commit -m "$(cat <<'EOF'
feat(medical): add summary card

3x3 grid: Pending / Cleared / Hospital rows × Red / Blue / Total
columns. Pure presentational component fed by computeMedicalSummary.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Create the medical table

**Files:**
- Create: `src/components/medical/medical-table.tsx`

This is the largest component — search box, corner filter, status filter, table body. Receives `rows` and `onChangeStatus` from the parent so the same component is used by both internal and public pages.

- [ ] **Step 1: Write the component**

Use Write to create `src/components/medical/medical-table.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MedicalRow, MedicalStatus } from '@/types/medical'
import { MedicalStatusCell } from './medical-status-cell'
import { MedicalWhatsAppLink } from './medical-whatsapp-link'

type CornerFilter = 'ALL' | 'RED' | 'BLUE'
type ShowFilter = 'pending' | 'all' | 'cleared_by_doctor' | 'sent_to_hospital'

interface Props {
  rows: MedicalRow[]
  onChangeStatus: (enrolledId: string, status: MedicalStatus) => void
  readOnly?: boolean
}

export function MedicalTable({ rows, onChangeStatus, readOnly }: Props) {
  const [search, setSearch] = useState('')
  const [cornerFilter, setCornerFilter] = useState<CornerFilter>('ALL')
  const [showFilter, setShowFilter] = useState<ShowFilter>('pending')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (cornerFilter !== 'ALL' && r.corner !== cornerFilter) return false
      if (showFilter !== 'all' && r.status !== showFilter) return false
      if (!term) return true
      return (
        r.person.compiled_name.toLowerCase().includes(term) ||
        (r.person.fighter_id ?? '').toLowerCase().includes(term) ||
        (r.corner ?? '').toLowerCase().includes(term)
      )
    })
  }, [rows, search, cornerFilter, showFilter])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, fighter id, corner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={cornerFilter} onValueChange={(v) => setCornerFilter(v as CornerFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Corners</SelectItem>
            <SelectItem value="RED">Red</SelectItem>
            <SelectItem value="BLUE">Blue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={showFilter} onValueChange={(v) => setShowFilter(v as ShowFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending only</SelectItem>
            <SelectItem value="cleared_by_doctor">Cleared</SelectItem>
            <SelectItem value="sent_to_hospital">Sent to Hospital</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              <TableHead className="w-[60px]">Photo</TableHead>
              <TableHead>Athlete</TableHead>
              <TableHead className="w-[90px] text-center">Corner</TableHead>
              <TableHead className="w-[60px] text-center">WA</TableHead>
              <TableHead className="w-[200px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No athletes match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.enrolled_id}>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {row.fight_order ?? '-'}
                </TableCell>
                <TableCell>
                  <Avatar
                    className={cn(
                      'h-9 w-9 border-2',
                      row.corner === 'RED'
                        ? 'border-red-500'
                        : row.corner === 'BLUE'
                        ? 'border-blue-500'
                        : 'border-muted'
                    )}
                  >
                    <AvatarImage src={row.person.photo_url ?? ''} />
                    <AvatarFallback>{row.person.compiled_name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium text-sm">{row.person.compiled_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {row.person.nationality ?? ''}{row.person.fighter_id ? ` · ${row.person.fighter_id}` : ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      row.corner === 'RED'
                        ? 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/20'
                        : row.corner === 'BLUE'
                        ? 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                        : ''
                    )}
                  >
                    {row.corner ?? '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <MedicalWhatsAppLink phone={row.person.phone} />
                </TableCell>
                <TableCell>
                  <MedicalStatusCell
                    value={row.status}
                    onChange={(status) => onChangeStatus(row.enrolled_id, status)}
                    disabled={readOnly}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "medical-table" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/components/medical/medical-table.tsx
git commit -m "$(cat <<'EOF'
feat(medical): add medical table with filters

Shared table used by both internal and public pages. Search,
corner filter (All/Red/Blue), and show filter (default Pending only,
plus Cleared, Sent to Hospital, All). Renders status dropdown and
WhatsApp icon per row. readOnly prop disables the dropdown for
viewer-role users on the internal page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Create the internal page

**Files:**
- Create: `src/app/(dashboard)/events/[eventId]/medical/page.tsx`

- [ ] **Step 1: Write the page**

Use Write to create `src/app/(dashboard)/events/[eventId]/medical/page.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getMedicalData, updateMedicalStatus, computeMedicalSummary } from '@/lib/services/medical-service'
import { MedicalSummaryCard } from '@/components/medical/medical-summary-card'
import { MedicalTable } from '@/components/medical/medical-table'
import { usePermissions } from '@/hooks/use-permissions'
import type { MedicalRow, MedicalStatus } from '@/types/medical'

export default function MedicalPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [rows, setRows] = useState<MedicalRow[]>([])
  const [eventName, setEventName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { canEdit, isAdmin, loading: permissionsLoading } = usePermissions()
  const canEditMedical = isAdmin || canEdit('pre_event')

  const summary = useMemo(() => computeMedicalSummary(rows), [rows])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getMedicalData(eventId)
      setRows(result)
      if (result.length > 0 && result[0].event_name) setEventName(result[0].event_name)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load medical data')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime sync — reload on any change to this event's clearances
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`medical-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mma_medical_clearance', filter: `event_id=eq.${eventId}` },
        () => loadData()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, loadData])

  const handleChangeStatus = async (enrolledId: string, status: MedicalStatus) => {
    // Optimistic update
    setRows((prev) => prev.map((r) => (r.enrolled_id === enrolledId ? { ...r, status } : r)))
    try {
      await updateMedicalStatus(eventId, enrolledId, status)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save status')
      loadData() // revert
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/public/medical/${eventId}`
    navigator.clipboard.writeText(url)
    toast.success('Public link copied to clipboard')
  }

  const handleOpenPublic = () => {
    window.open(`/public/medical/${eventId}`, '_blank')
  }

  return (
    <div className="flex flex-col h-full space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {eventName ? `${eventName} — Medical Clearance` : 'Medical Clearance'}
          </h2>
          <p className="text-muted-foreground">
            Time médico avalia e libera atletas para a luta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink} title="Copy Public Link">
            <Copy className="mr-2 h-4 w-4" /> Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenPublic}>
            <ExternalLink className="mr-2 h-4 w-4" /> Public Monitor
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <MedicalSummaryCard summary={summary} />

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading medical data...</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
          <p className="font-medium text-lg">No athletes found for this event.</p>
          <p className="text-muted-foreground text-sm">Ensure athletes are enrolled in the system.</p>
        </div>
      ) : (
        <MedicalTable
          rows={rows}
          onChangeStatus={handleChangeStatus}
          readOnly={!permissionsLoading && !canEditMedical}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "(dashboard)/events/\[eventId\]/medical/page.tsx" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(dashboard)/events/[eventId]/medical/page.tsx'
git commit -m "$(cat <<'EOF'
feat(medical): add internal medical clearance page

Internal route at /events/[eventId]/medical. Loads via
getMedicalData, derives the summary in the client (computeMedicalSummary),
subscribes to Supabase Realtime for cross-tab sync, and updates
status optimistically with a revert-on-error fallback. Copy Link and
Public Monitor mirror the staging UX exactly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Create the public page

**Files:**
- Create: `src/app/public/medical/[eventId]/page.tsx`

- [ ] **Step 1: Write the page**

Use Write to create `src/app/public/medical/[eventId]/page.tsx`:

```tsx
'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getPublicMedicalData, updateMedicalStatusPublic } from '@/lib/actions/public-medical'
import { computeMedicalSummary } from '@/lib/services/medical-service'
import { MedicalSummaryCard } from '@/components/medical/medical-summary-card'
import { MedicalTable } from '@/components/medical/medical-table'
import type { MedicalRow, MedicalStatus } from '@/types/medical'

interface Props {
  params: Promise<{ eventId: string }>
}

export default function PublicMedicalPage({ params }: Props) {
  const { eventId } = use(params)
  const [rows, setRows] = useState<MedicalRow[]>([])
  const [loading, setLoading] = useState(true)

  const summary = useMemo(() => computeMedicalSummary(rows), [rows])
  const eventName = rows[0]?.event_name ?? ''

  const loadData = useCallback(async () => {
    try {
      const result = await getPublicMedicalData(eventId)
      setRows(result)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime — same channel as the internal page
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`medical-public-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mma_medical_clearance', filter: `event_id=eq.${eventId}` },
        () => loadData()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, loadData])

  const handleChangeStatus = async (enrolledId: string, status: MedicalStatus) => {
    setRows((prev) => prev.map((r) => (r.enrolled_id === enrolledId ? { ...r, status } : r)))
    const result = await updateMedicalStatusPublic(eventId, enrolledId, status)
    if (!result.success) {
      toast.error(result.error || 'Failed to save status')
      loadData()
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">
          {eventName ? `${eventName} — Medical Clearance` : 'Medical Clearance'}
        </h1>

        <MedicalSummaryCard summary={summary} />

        {loading && rows.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No athletes found for this event.</div>
        ) : (
          <MedicalTable rows={rows} onChangeStatus={handleChangeStatus} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "public/medical/\[eventId\]/page.tsx" || echo "ok"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add 'src/app/public/medical/[eventId]/page.tsx'
git commit -m "$(cat <<'EOF'
feat(medical): add public medical clearance page

No-auth route at /public/medical/[eventId]. Reuses the same table
and summary components from the internal page. Reads via the public
Server Action (service role), writes go through updateMedicalStatusPublic
which validates the enrolledId belongs to the event. Realtime channel
keeps it in sync with the internal page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Add sidebar entry + manual validation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add the Medical entry to the navItems array**

Use Edit on `src/components/layout/sidebar.tsx`. Find:

```ts
  { label: 'Pre-Departure Check', href: '/staging', icon: 'ClipboardList', area: 'pre_event' },
```

Replace with:

```ts
  { label: 'Pre-Departure Check', href: '/staging', icon: 'ClipboardList', area: 'pre_event' },
  { label: 'Medical', href: '/medical', icon: 'Stethoscope', area: 'pre_event' },
```

- [ ] **Step 2: Add the Stethoscope icon import**

In the same file, find the `import` line for `lucide-react` (or wherever icons are imported — look around line 1-30). The icons map block is around line 30-46 (`ClipboardList` is the last entry).

Read the imports block (use Read on lines 1-50) and find the lucide-react import. Add `Stethoscope` to that import alphabetically. Also add `Stethoscope` to the icons map (object literal around line 30).

Example: if you see `import { ..., ClipboardList } from 'lucide-react'`, change to `import { ..., ClipboardList, Stethoscope } from 'lucide-react'`. And if you see:
```ts
const icons = {
  ...,
  ClipboardList,
}
```
add `Stethoscope,` to that object.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit 2>&1 | grep "sidebar" || echo "ok"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "$(cat <<'EOF'
feat(medical): add Medical sidebar entry

New 'Medical' entry under pre_event area. Sidebar's existing logic
prefixes /events/[eventId] when inside an event scope, so the link
resolves correctly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Manual validation in browser**

Restart the dev server to pick up env var / route changes:
```bash
pkill -f "next-server"; sleep 2
pnpm dev
```

Wait for `✓ Ready`. Then run through each scenario:

5.1. **Sidebar entry visible**
- Open `http://localhost:3000/events/24150178-f2f0-4bd8-8fcb-97b9cb9df528/staging` (existing event).
- Confirm "Medical" entry appears in the sidebar between "Pre-Departure Check" and the next item.
- Click it. URL should become `/events/24150178-f2f0-4bd8-8fcb-97b9cb9df528/medical`.

5.2. **Initial render**
- Page loads with header `<eventName> — Medical Clearance`.
- Summary card shows counters; if all athletes are pending: only Pending row populated, others zero.
- Table lists athletes with `Pending` status, default filter shows them all.

5.3. **Change status (optimistic + persisted)**
- Pick one athlete (e.g. Aaron Luke Aby, RED corner).
- Open the dropdown → choose `Cleared by Doctor`.
- Visual: dropdown turns green immediately.
- Athlete disappears from list (filter is "Pending only").
- Summary card: Pending decreases by 1 in RED column, Cleared increases by 1 in RED.
- Trigger F5 → state persists. Confirm in Supabase Studio that a row now exists in `mma_medical_clearance`.

5.4. **Filter cycling**
- Switch "Show" filter to `Cleared` → Aaron appears.
- Switch to `All` → all athletes including Aaron appear.

5.5. **WhatsApp link**
- Find an athlete with phone (most synced from Sheet have one). Confirm green WA icon visible.
- Click it → opens new tab to `wa.me/<digits>`.
- Find an athlete without phone (or temporarily clear it in Supabase) → cell renders empty.

5.6. **Public page**
- Click "Public Monitor" → new tab to `/public/medical/<eventId>`.
- In the new tab, confirm: header, summary, table all render. URL has no auth.
- Open the same URL in an Incognito window → still loads (no login).
- In incognito, change a status. Toast appears, dropdown updates.
- Confirm in Supabase Studio that the change persisted.

5.7. **Realtime cross-tab sync**
- Open admin page in tab A and public page in tab B (or two browsers).
- Change a status in tab A → tab B updates within 1-2 seconds (no manual refresh).
- Change a status in tab B → tab A updates within 1-2 seconds.

5.8. **Permissions**
- If you have a viewer-role test user: log in and visit the admin page — dropdowns are disabled.
- Skip if no such test user exists; document this and move on.

5.9. **Empty state**
- Navigate to an event with zero enrollments (or use a fake `eventId`). Page shows "No athletes found for this event." graciously.

5.10. **Existing modules untouched**
- Open `/events/<id>/staging`. Confirm it loads and works as before.
- Open `/people`. Confirm sync button still works.

Document any failures and fix before proceeding.

---

## Task 12: Wrap up — final cleanup

**Files:** None.

- [ ] **Step 1: Confirm git history is clean**

Run: `git log --oneline main..HEAD`

Expected: 11 task commits + this final task is just a no-op marker. If a commit is missing, identify and re-do that task.

- [ ] **Step 2: Confirm no TS errors at all**

Run: `pnpm tsc --noEmit 2>&1 | tail -5`
Expected: empty output (no errors anywhere in the project).

- [ ] **Step 3: Confirm working tree is clean of incidental modifications**

Run: `git status --short`

Expected: only the unrelated pre-existing modifications that were there before starting this feature (fight-card/page.tsx, dashboard-service.ts, src/types/stats.ts, etc.). No accidental changes from this work.

- [ ] **Step 4: Hand off to user for merge decision**

The branch `feature/medical-clearance` is ready. Merge to main when validated, same as the previous `feature/people-google-sheet-sync`:

```bash
git checkout main && git merge --no-ff feature/medical-clearance
git branch -d feature/medical-clearance
```

(Push to `origin` requires a credential change since this account does not have write access to `DSciAILab/uaewapp_v2`.)

---

## Self-Review

**Spec coverage:**
- ✅ Tabela `mma_medical_clearance` com schema, indexes, RLS → Task 1
- ✅ Tipos `MedicalStatus`, `MedicalClearance`, `MedicalRow`, `MedicalSummary` → Task 2
- ✅ Service: `getMedicalData`, `updateMedicalStatus`, `computeMedicalSummary` → Task 3
- ✅ Server Action: `getPublicMedicalData`, `updateMedicalStatusPublic` → Task 4
- ✅ WhatsApp link com hide-when-null → Task 5
- ✅ Status dropdown 3-valores colorido → Task 6
- ✅ Summary card 3×3 → Task 7
- ✅ Table com filtros (search/corner/show=Pending only default) → Task 8
- ✅ Página interna com Copy Link / Public Monitor / Refresh → Task 9
- ✅ Página pública sem auth → Task 10
- ✅ Sidebar entry contextual ao evento → Task 11
- ✅ Realtime sync nas 2 páginas → Tasks 9 + 10
- ✅ Permissões reusam `usePermissions` → Task 9
- ✅ Manual validation cobrindo todos os cenários da spec → Task 11.5

**Placeholder scan:** None.

**Type consistency:**
- `MedicalStatus` referenciado nos tipos (Task 2) e usado em service (Task 3), action (Task 4), components (Tasks 6, 8), pages (Tasks 9, 10) — todos batem.
- `MedicalRow.id: string | null` consistente em Task 3 e Task 4.
- `MedicalRow.person.phone: string | null` consistente em Task 3 e Task 4.
- `MedicalSummary` com sub-objects `red/blue/total` × `pending/cleared/hospital` consistente em Task 2, Task 3 (computeMedicalSummary), Task 7 (component).
- `computeMedicalSummary` exportado de `medical-service.ts` (Task 3), importado em Task 9 (internal page) e Task 10 (public page) — caminhos certos.

No issues found. Plan is ready.
