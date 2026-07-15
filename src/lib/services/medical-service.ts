import { createClient } from '@/lib/supabase/client'
import type {
  MedicalClearance,
  MedicalLogEntry,
  MedicalRow,
  MedicalStatus,
  MedicalSummary,
} from '@/types/medical'
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
      person:mma_people(id, name, surname, nationality, appadmin_fighter_id, passport_photo, phone, event_name),
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

  // Pull every "sent_to_hospital" log entry for this event in one shot,
  // then build a Set of enrolled_ids that have ever been to hospital.
  const { data: hospitalLogs } = await supabase
    .from('mma_medical_clearance_log')
    .select('enrolled_id')
    .eq('event_id', eventId)
    .eq('new_status', 'sent_to_hospital')

  const wasAtHospital = new Set<string>()
  ;(hospitalLogs || []).forEach((l: { enrolled_id: string }) => wasAtHospital.add(l.enrolled_id))

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
      notes: existing?.notes ?? null,
      was_at_hospital: wasAtHospital.has(enr.id),
      corner: (match.corner as 'RED' | 'BLUE' | null) ?? null,
      fight_order: match.matchNumber ?? null,
      person: {
        id: person.id,
        compiled_name: match.name || eventName || fullName,
        nationality: person.nationality ?? null,
        appadmin_fighter_id: person.appadmin_fighter_id ?? null,
        phone: person.phone ?? null,
        photo_url: getFighterPhotoUrl(person.appadmin_fighter_id) || person.passport_photo || null,
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
 * Upsert the notes field for a clearance row.
 */
export async function updateMedicalNotes(
  eventId: string,
  enrolledId: string,
  notes: string | null
): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase
    .from('mma_medical_clearance')
    .upsert(
      {
        event_id: eventId,
        enrolled_id: enrolledId,
        notes: notes && notes.trim() ? notes : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,enrolled_id' }
    )

  if (error) throw error
}

/**
 * Destructive — wipes every clearance row for this event. Cascades into
 * mma_medical_clearance_log via FK. Returns the number of rows deleted.
 */
export async function resetEventMedicalStatus(eventId: string): Promise<number> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('mma_medical_clearance')
    .delete()
    .eq('event_id', eventId)
    .select('id')

  if (error) throw error
  return data?.length ?? 0
}

/**
 * Returns the chronological log of status changes for a single athlete,
 * ordered most recent first.
 */
export async function getMedicalHistory(
  eventId: string,
  enrolledId: string
): Promise<MedicalLogEntry[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('mma_medical_clearance_log')
    .select('*')
    .eq('event_id', eventId)
    .eq('enrolled_id', enrolledId)
    .order('changed_at', { ascending: false })

  if (error) throw error
  return (data || []) as MedicalLogEntry[]
}

/**
 * Pure function — derives the 3x3 summary from an array of rows.
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
