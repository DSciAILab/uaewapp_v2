import { createClient } from '@/lib/supabase/client';
import {
  Batch,
  BatchFormData,
  BatchParticipant,
  BatchParticipantFormData,
  BatchFilters,
  BatchStatus,
  BatchParticipantStatus,
  BatchType,
  BatchTimeline,
} from '@/types/batch';
import type { Database, Json } from '@/types/supabase';

function getClient() {
  return createClient();
}

// ==================== BATCHES ====================

export async function getEventBatches(eventId: string, filters?: BatchFilters): Promise<Batch[]> {
  const supabase = getClient();
  let query = supabase
    .from('mma_batches')
    .select(`
      *,
      participants:mma_batch_participants(count)
    `)
    .eq('event_id', eventId)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (filters?.batch_type) {
    query = query.eq('batch_type', filters.batch_type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.scheduled_date) {
    query = query.eq('scheduled_date', filters.scheduled_date);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch batches');

  let results = (data || []).map((batch) => ({
    ...batch,
    participant_count: batch.participants?.[0]?.count || 0,
  }));

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter((batch) =>
      (batch.name || '').toLowerCase().includes(searchLower) ||
      (batch.location || '').toLowerCase().includes(searchLower)
    );
  }

  return results as unknown as Batch[];
}

export async function getBatchById(batchId: string): Promise<Batch | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_batches')
    .select(`
      *,
      participants:mma_batch_participants(
        *,
        enrolled:mma_enrollments(
          id,
          person:mma_people(id, compiled_name), role:mma_roles(name)
        )
      )
    `)
    .eq('id', batchId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as Batch | null;
}

async function getNextBatchNumber(eventId: string, batchType: BatchType): Promise<number> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_batches')
    .select('batch_number')
    .eq('event_id', eventId)
    .eq('batch_type', batchType)
    .order('batch_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  return (data?.[0]?.batch_number || 0) + 1;
}

export async function createBatch(eventId: string, formData: BatchFormData): Promise<Batch> {
  const supabase = getClient();
  const batchNumber = await getNextBatchNumber(eventId, formData.batch_type);

  const payload: Database['public']['Tables']['mma_batches']['Insert'] = {
    event_id: eventId,
    batch_type: formData.batch_type,
    batch_number: batchNumber,
    name: formData.name,
    scheduled_date: formData.scheduled_date,
    // scheduled_time is NOT NULL with no DB default; start_time is the value the
    // form collects for it, so the two are kept in sync.
    scheduled_time: formData.start_time,
    start_time: formData.start_time,
    end_time: formData.end_time || null,
    location: formData.location || null,
    room: formData.room || null,
    max_capacity: formData.max_capacity || null,
    status: formData.status,
    notes: formData.notes || null,
  };

  const { data, error } = await supabase
    .from('mma_batches')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error('Failed to create batch');

  return data as unknown as Batch;
}

export async function updateBatch(batchId: string, formData: Partial<BatchFormData>): Promise<Batch> {
  const supabase = getClient();

  // Explicit whitelist: only real mma_batches columns may reach PostgREST.
  const payload: Database['public']['Tables']['mma_batches']['Update'] = {};

  if (formData.batch_type !== undefined) payload.batch_type = formData.batch_type;
  if (formData.name !== undefined) payload.name = formData.name;
  if (formData.scheduled_date !== undefined) payload.scheduled_date = formData.scheduled_date;
  if (formData.start_time !== undefined) {
    payload.start_time = formData.start_time;
    payload.scheduled_time = formData.start_time;
  }
  if (formData.end_time !== undefined) payload.end_time = formData.end_time || null;
  if (formData.location !== undefined) payload.location = formData.location || null;
  if (formData.room !== undefined) payload.room = formData.room || null;
  if (formData.max_capacity !== undefined) payload.max_capacity = formData.max_capacity || null;
  if (formData.status !== undefined) payload.status = formData.status;
  if (formData.notes !== undefined) payload.notes = formData.notes || null;

  const { data, error } = await supabase
    .from('mma_batches')
    .update(payload)
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw new Error('Failed to update batch');

  return data as unknown as Batch;
}

export async function deleteBatch(batchId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_batches')
    .delete()
    .eq('id', batchId);

  if (error) throw new Error('Failed to delete batch');
}

export async function updateBatchStatus(batchId: string, status: BatchStatus): Promise<Batch> {
  const updateData: Database['public']['Tables']['mma_batches']['Update'] = { status };

  if (status === 'in_progress') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_batches')
    .update(updateData)
    .eq('id', batchId)
    .select()
    .single();

  if (error) throw new Error('Failed to update batch status');

  return data as unknown as Batch;
}

// ==================== BATCH PARTICIPANTS ====================

export async function getBatchParticipants(batchId: string): Promise<BatchParticipant[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_batch_participants')
    .select(`
      *,
      enrolled:mma_enrollments(
        id,
        person:mma_people(id, compiled_name), role:mma_roles(name)
      )
    `)
    .eq('batch_id', batchId)
    .order('order_number');

  if (error) throw new Error('Failed to fetch batch participants');

  return (data || []) as unknown as BatchParticipant[];
}

export async function addParticipantToBatch(
  batchId: string,
  formData: BatchParticipantFormData
): Promise<BatchParticipant> {
  const supabase = getClient();
  // Get next order number
  const { data: existing } = await supabase
    .from('mma_batch_participants')
    .select('order_number')
    .eq('batch_id', batchId)
    .order('order_number', { ascending: false })
    .limit(1);

  const orderNumber = formData.order_number || ((existing?.[0]?.order_number || 0) + 1);

  const { data, error } = await supabase
    .from('mma_batch_participants')
    .insert({
      batch_id: batchId,
      enrolled_id: formData.enrolled_id,
      order_number: orderNumber,
      status: formData.status || 'assigned',
      notes: formData.notes || null,
    })
    .select(`
      *,
      enrolled:mma_enrollments(
        id,
        person:mma_people(id, compiled_name), role:mma_roles(name)
      )
    `)
    .single();

  if (error) throw new Error('Failed to add participant to batch');

  return data as unknown as BatchParticipant;
}

export async function removeParticipantFromBatch(participantId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_batch_participants')
    .delete()
    .eq('id', participantId);

  if (error) throw new Error('Failed to remove participant from batch');
}

export async function updateParticipantStatus(
  participantId: string,
  status: BatchParticipantStatus
): Promise<BatchParticipant> {
  const updateData: Database['public']['Tables']['mma_batch_participants']['Update'] = { status };

  if (status === 'checked_in') {
    updateData.checked_in_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }



  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_batch_participants')
    .update(updateData)
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw new Error('Failed to update participant status');

  return data as unknown as BatchParticipant;
}

export async function updateParticipantResult(
  participantId: string,
  resultData: Record<string, unknown>
): Promise<BatchParticipant> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_batch_participants')
    .update({
      result_data: resultData as Json,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw new Error('Failed to update participant result');

  return data as unknown as BatchParticipant;
}

export async function reorderParticipants(batchId: string, orderedIds: string[]): Promise<void> {
  const supabase = getClient();
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('mma_batch_participants')
      .update({ order_number: index + 1 })
      .eq('id', id)
      .eq('batch_id', batchId)
  );

  await Promise.all(updates);
}

export async function checkInParticipant(participantId: string): Promise<BatchParticipant> {
  return updateParticipantStatus(participantId, 'checked_in');
}

export async function markParticipantComplete(participantId: string): Promise<BatchParticipant> {
  return updateParticipantStatus(participantId, 'completed');
}

export async function markParticipantNoShow(participantId: string): Promise<BatchParticipant> {
  return updateParticipantStatus(participantId, 'no_show');
}

// ==================== BATCH TIMELINE ====================

export async function getBatchTimeline(eventId: string): Promise<BatchTimeline[]> {
  const batches = await getEventBatches(eventId);

  // Group by date
  const byDate: Map<string, Batch[]> = new Map();

  for (const batch of batches) {
    const date = batch.scheduled_date;
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(batch);
  }

  // Convert to timeline format and sort by date
  const timeline: BatchTimeline[] = Array.from(byDate.entries())
    .map(([date, batches]) => ({ date, batches }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return timeline;
}

// ==================== UTILITIES ====================

export async function getAvailableEnrolledForBatch(
  eventId: string,
  batchId: string
): Promise<Array<{
  id: string;
  person: { id: string; compiled_name: string; role: string };
}>> {
  const supabase = getClient();
  // Get all enrolled for event
  const { data: enrolled, error: enrolledError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      person:mma_people!inner(id, compiled_name), role:mma_roles(name)
    `)
    .eq('event_id', eventId);

  if (enrolledError) throw enrolledError;

  // Get already assigned to this batch
  const { data: assigned, error: assignedError } = await supabase
    .from('mma_batch_participants')
    .select('enrolled_id')
    .eq('batch_id', batchId);

  if (assignedError) throw assignedError;

  const assignedIds = new Set(assigned?.map((a) => a.enrolled_id) || []);

  return (enrolled || [])
    .map((e) => ({
      id: e.id,
      person: (Array.isArray(e.person) ? e.person[0] : e.person) as { id: string; compiled_name: string; role: string },
    }))
    .filter((e) => !assignedIds.has(e.id));
}

export async function getBatchStats(eventId: string): Promise<{
  total: number;
  by_type: Record<BatchType, number>;
  by_status: Record<string, number>;
  total_participants: number;
  checked_in: number;
  completed: number;
}> {
  const batches = await getEventBatches(eventId);

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const batch of batches) {
    byType[batch.batch_type] = (byType[batch.batch_type] || 0) + 1;
    byStatus[batch.status] = (byStatus[batch.status] || 0) + 1;
  }

  // Get participant stats
  const supabase = getClient();
  const { data: participants, error } = await supabase
    .from('mma_batch_participants')
    .select('status, batch:mma_batches!inner(event_id)')
    .eq('batch.event_id', eventId);

  if (error) throw error;

  const allParticipants = participants || [];

  return {
    total: batches.length,
    by_type: byType as Record<BatchType, number>,
    by_status: byStatus,
    total_participants: allParticipants.length,
    checked_in: allParticipants.filter((p) => p.status === 'checked_in' || p.status === 'completed').length,
    completed: allParticipants.filter((p) => p.status === 'completed').length,
  };
}
