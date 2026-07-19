import { createClient } from '@/lib/supabase/client'

/**
 * "Where is this person right now", as one short line to print under their name.
 *
 * The rule is the operator's, not a technical one: having a room IS the arrival
 * signal, because a room is only handed over at check-in. So a filled room
 * number means they are here; no room yet means the inbound flight is the thing
 * the person holding the printout actually needs. This is the same rule the wall
 * display uses, deliberately -- the paper in someone's hand and the TV on the
 * wall have to tell the same story.
 *
 * NOTE: dashboard-matrix.ts implements this same rule for the wall display. It
 * is duplicated here on purpose and only for now: that file is what feeds the
 * live TV, and rewriting it mid-event to share this helper is not a risk worth
 * taking. Point it here once the event is over -- two copies of one rule is how
 * they drift apart.
 */
export async function getWhereaboutsMap(eventId: string): Promise<Map<string, string>> {
  const supabase = createClient()
  const whereabouts = new Map<string, string>()

  const [hotelsRes, flightsRes] = await Promise.all([
    supabase.from('mma_hotels').select('enrollment_id, room_number').eq('event_id', eventId),
    supabase
      .from('mma_flights')
      .select('enrollment_id, arrival_flight_number, arrival_date, arrival_time, arrival_airport')
      .eq('event_id', eventId),
  ])

  // Flights first, so a room assignment overwrites them below.
  for (const flight of flightsRes.data || []) {
    const parts = [
      String(flight.arrival_flight_number ?? '').trim(),
      String(flight.arrival_date ?? '').trim(),
      String(flight.arrival_time ?? '').trim(),
      String(flight.arrival_airport ?? '').trim(),
    ].filter(Boolean)
    if (parts.length === 0) continue
    whereabouts.set(flight.enrollment_id as string, parts.join(' · '))
  }

  for (const hotel of hotelsRes.data || []) {
    const room = String(hotel.room_number ?? '').trim()
    if (!room) continue
    whereabouts.set(hotel.enrollment_id as string, `ROOM ${room}`)
  }

  return whereabouts
}
