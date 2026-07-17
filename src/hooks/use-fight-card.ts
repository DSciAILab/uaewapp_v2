'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getFightCardPositions, type EnrollmentIdentity, type FightCardPosition } from '@/lib/services/fight-card-positions'
import { getEventById } from '@/lib/services/events'

export type CardPerson = EnrollmentIdentity & { eventId: string | null | undefined }

/**
 * Corner, bout order and event name for a set of enrollments (UAE-20).
 *
 * Resolved per distinct event rather than per table: these tables are not all
 * event-scoped — the global views mix events — so an eventId only exists on the
 * row. An enrollment with no entry simply is not on the card (staff, guest, or
 * an athlete not paired yet) and renders grey with no order, never a guess.
 *
 * Lives here because four tables need exactly this and each had grown its own
 * copy, which had already begun to drift.
 */
export function useFightCard(people: CardPerson[], label = 'fight-card') {
  const [positions, setPositions] = useState<Map<string, FightCardPosition>>(new Map())
  const [eventNames, setEventNames] = useState<Map<string, string>>(new Map())

  // Read inside the effect only — the effect re-runs on `signature`, not identity.
  const peopleRef = useRef(people)
  peopleRef.current = people

  const signature = useMemo(
    () => people.map((p) => `${p.eventId ?? ''}:${p.enrollmentId}`).sort().join('|'),
    [people]
  )

  useEffect(() => {
    let cancelled = false

    const byEvent = new Map<string, EnrollmentIdentity[]>()
    for (const p of peopleRef.current) {
      if (!p.eventId) continue
      const roster = byEvent.get(p.eventId) ?? []
      roster.push({ enrollmentId: p.enrollmentId, fullName: p.fullName, ringName: p.ringName })
      byEvent.set(p.eventId, roster)
    }

    Promise.all(
      Array.from(byEvent, async ([eventId, roster]) => ({
        eventId,
        map: await getFightCardPositions(eventId, roster),
        name: await getEventById(eventId).then((e) => e?.name ?? null).catch(() => null),
      }))
    )
      .then((results) => {
        if (cancelled) return
        const merged = new Map<string, FightCardPosition>()
        const names = new Map<string, string>()
        for (const r of results) {
          for (const [id, pos] of r.map) merged.set(id, pos)
          if (r.name) names.set(r.eventId, r.name)
        }
        setPositions(merged)
        setEventNames(names)
      })
      .catch((err) => console.warn(`[${label}] fight card lookup failed:`, err))

    return () => {
      cancelled = true
    }
  }, [signature, label])

  return { positions, eventNames }
}
