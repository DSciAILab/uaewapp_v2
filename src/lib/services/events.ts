import { createClient } from '@/lib/supabase/client'
import type { Event, EventStatus } from '@/types/database'
import { seedCatalogTasks } from './event-task-seed'

function getClient() {
  return createClient();
}

export interface EventFilters {
  status?: EventStatus
  search?: string
}

export interface EventFormData {
  name: string
  code?: string | null
  event_date: string
  event_end_date?: string | null
  city?: string | null
  country?: string | null
  venue?: string | null
  main_airport?: string | null
  checkin_margin_hours?: number
  checkout_margin_hours?: number
  status?: EventStatus
  fight_card_csv_url?: string | null
  notes?: string | null
}

export async function getEvents(filters: EventFilters = {}): Promise<Event[]> {
  const supabase = getClient();
  let query = supabase
    .from('mma_events')
    .select('*')
    .order('event_date', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []) as Event[]
}

export async function getEventById(id: string): Promise<Event | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Event | null
}

export async function createEvent(formData: EventFormData): Promise<Event> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_events')
    .insert({
      ...formData,
      checkin_margin_hours: formData.checkin_margin_hours || 3,
      checkout_margin_hours: formData.checkout_margin_hours || 4,
      status: formData.status || 'planning',
    })
    .select()
    .single()

  if (error) throw error
  // UAE-88: the fixed tasks exist from day one, not on the first sidebar click.
  await seedCatalogTasks((data as Event).id)
  return data as Event
}

export async function updateEvent(id: string, formData: Partial<EventFormData>): Promise<Event> {
  const supabase = getClient();
  // Seed only on the planning -> active transition, never on a plain save of an
  // active event: a re-seed would bring back tasks or fighters staff removed.
  let activating = false
  if (formData.status === 'active') {
    const { data: before } = await supabase.from('mma_events').select('status').eq('id', id).maybeSingle()
    activating = !!before && before.status !== 'active'
  }
  const { data, error } = await supabase
    .from('mma_events')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  if (activating) await seedCatalogTasks(id)
  return data as Event
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getActiveEvents(): Promise<Event[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_events')
    .select('*')
    .in('status', ['planning', 'active'])
    .order('event_date', { ascending: true })

  if (error) throw error
  return (data || []) as Event[]
}
