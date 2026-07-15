'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type {
  MedicalClearance,
  MedicalLogEntry,
  MedicalRow,
  MedicalStatus,
} from '@/types/medical'
import { getFightCardData } from '@/lib/services/stats-service'
import { normalizeName, getFighterPhotoUrl } from '@/lib/utils'

export async function getPublicMedicalData(eventId: string): Promise<MedicalRow[]> {
  const supabase = await createAdminClient()

  try {
    const [enrollmentRes, clearanceRes, hospitalLogRes, fightCard] = await Promise.all([
      supabase
        .from('mma_enrollments')
        .select(`
          id,
          person:mma_people(id, name, surname, nationality, appadmin_fighter_id, passport_photo, phone, event_name),
          event:mma_events(name),
          role:mma_roles!inner(code)
        `)
        .eq('event_id', eventId)
        .eq('status', 'active')
        .eq('role.code', 'F'),
      supabase.from('mma_medical_clearance').select('*').eq('event_id', eventId),
      supabase
        .from('mma_medical_clearance_log')
        .select('enrolled_id')
        .eq('event_id', eventId)
        .eq('new_status', 'sent_to_hospital'),
      getFightCardData(),
    ])

    if (enrollmentRes.error) console.error('[PublicMedical] enrollment error:', enrollmentRes.error)
    if (clearanceRes.error) console.error('[PublicMedical] clearance error:', clearanceRes.error)
    if (hospitalLogRes.error) console.error('[PublicMedical] log error:', hospitalLogRes.error)

    const enrollments = enrollmentRes.data || []
    const clearances = (clearanceRes.data || []) as unknown as MedicalClearance[]

    const clearanceMap = new Map<string, MedicalClearance>()
    clearances.forEach((c) => clearanceMap.set(c.enrolled_id, c))

    const wasAtHospital = new Set<string>()
    ;(hospitalLogRes.data || []).forEach((l: { enrolled_id: string }) =>
      wasAtHospital.add(l.enrolled_id)
    )

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
        event_name: Array.isArray(enr.event) ? (enr.event[0] as any)?.name ?? null : (enr.event as any)?.name ?? null,
      })
    }

    return rows.sort((a, b) => (a.fight_order ?? 999) - (b.fight_order ?? 999))
  } catch (err) {
    console.error('[PublicMedical] critical error:', err)
    return []
  }
}

// The public route is read-only by design — no write helpers live here.
// All mutations go through the authenticated dashboard service.

export async function getPublicMedicalHistory(
  eventId: string,
  enrolledId: string
): Promise<MedicalLogEntry[]> {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('mma_medical_clearance_log')
    .select('*')
    .eq('event_id', eventId)
    .eq('enrolled_id', enrolledId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('[PublicMedical] history error:', error)
    return []
  }
  return (data || []) as MedicalLogEntry[]
}
