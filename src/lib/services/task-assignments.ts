import { createClient } from '@/lib/supabase/client';
import { getEnrollmentsByEvent } from './enrollments';

// Types
export interface TaskAssignment {
  id: string;
  task_id: string;
  enrollment_id: string;
  status: 'pending' | 'completed' | 'exempt';
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  enrollment?: {
    id: string;
    person: {
      id: string;
      full_name: string;
      name?: string;
      surname?: string;
    };
    role: {
      name: string;
      code: string;
    };
  };
}

function getClient() {
  return createClient();
}

export async function getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_task_assignments')
    .select(`
      *,
      enrollment:mma_enrollments!inner(
        id,
        person:mma_people(id, full_name:compiled_name, name, surname),
        role:mma_roles(name, code)
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch task assignments');
  
  return data || [];
}

export async function createAssignments(taskId: string, enrollmentIds: string[]): Promise<void> {
  const supabase = getClient();
  
  const payload = enrollmentIds.map(eid => ({
    task_id: taskId,
    enrollment_id: eid,
    status: 'pending'
  }));

  const { error } = await supabase
    .from('mma_task_assignments')
    .insert(payload);

  if (error) {
    console.error('Create assignments error:', error);
    throw new Error('Failed to create assignments');
  }
}

export async function updateAssignmentStatus(
  assignmentId: string, 
  status: 'pending' | 'completed' | 'exempt', 
  notes?: string
): Promise<void> {
  const supabase = getClient();
  
  const payload: any = { 
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'completed') {
    payload.completed_at = new Date().toISOString();
  } else if (status === 'pending') {
    payload.completed_at = null;
  }

  if (notes !== undefined) {
    payload.notes = notes;
  }

  const { error } = await supabase
    .from('mma_task_assignments')
    .update(payload)
    .eq('id', assignmentId);

  if (error) throw new Error('Failed to update assignment');
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_task_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw new Error('Failed to delete assignment');
}

export async function getUnassignedEnrollments(eventId: string, taskId: string) {
  // 1. Get all enrollments
  const allEnrollments = await getEnrollmentsByEvent(eventId);
  
  // 2. Get existing assignments
  const existingAssignments = await getTaskAssignments(taskId);
  const assignedIds = new Set(existingAssignments.map(a => a.enrollment_id));
  
  // 3. Filter
  return allEnrollments.filter(e => !assignedIds.has(e.id));
}
