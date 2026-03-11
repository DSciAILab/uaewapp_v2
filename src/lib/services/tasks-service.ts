import { createClient } from '@/lib/supabase/client';
import { EventTask, EventTaskFormData, TaskFilters } from '@/types/task';

function getClient() {
  return createClient();
}

export async function getEventTasks(eventId: string, filters: TaskFilters = {}): Promise<EventTask[]> {
  const supabase = getClient();
  let query = supabase
    .from('mma_athlete_tasks')
    .select(`
      *,
      assigned_user:mma_users!assigned_to(id, compiled_name),
      template:mma_task_templates(id, name)
    `)
    .eq('event_id', eventId);
    
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  
  if (filters.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  
  const { data, error } = await query.order('due_date', { ascending: true });

  if (error) throw new Error('Failed to fetch tasks');

  return data;
}

export async function getAthleteTasks(eventId: string, assignedTo: string): Promise<EventTask[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_athlete_tasks')
    .select('*')
    .eq('event_id', eventId)
    .eq('assigned_to', assignedTo) // Assuming tasks are assigned to the athlete or their handler
    .order('due_date', { ascending: true });
    
  if (error) throw new Error('Failed to fetch athlete tasks');
  
  return data;
}

export async function createTask(eventId: string, formData: EventTaskFormData): Promise<EventTask> {
  const supabase = getClient();
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('mma_athlete_tasks')
    .insert({
      event_id: eventId,
      template_id: formData.template_id || null,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      assigned_by: user?.user?.id || null,
      due_date: formData.due_date || null,
      due_time: formData.due_time || null,
      checklist_items: formData.checklist_items.map(text => ({
        id: crypto.randomUUID(),
        text,
        completed: false,
        completed_at: null,
        completed_by: null
      })),
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create task');

  return data;
}

export async function updateTask(taskId: string, formData: Partial<EventTaskFormData>): Promise<EventTask> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_athlete_tasks')
    .update(formData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to update task');

  return data;
}

export async function updateTaskStatus(taskId: string, status: EventTask['status']): Promise<EventTask> {
  const updates: any = { status };
  
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  } else if (status === 'in_progress') {
    updates.started_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }
  

  
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_athlete_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
    
  if (error) throw new Error('Failed to update task status');
  
  return data;
}

export async function toggleChecklistItem(taskId: string, itemId: string, completed: boolean): Promise<EventTask> {
  const supabase = getClient();
  const { data: currentTask } = await supabase
    .from('mma_athlete_tasks')
    .select('checklist_items')
    .eq('id', taskId)
    .single();
    
  if (!currentTask) throw new Error('Task not found');
  
  const { data: user } = await supabase.auth.getUser();
  
  const newItems = currentTask.checklist_items.map((item: any) => {
    if (item.id === itemId) {
      return {
        ...item,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? user?.user?.id : null
      };
    }
    return item;
  });
  
  const { data, error } = await supabase
    .from('mma_athlete_tasks')
    .update({ checklist_items: newItems })
    .eq('id', taskId)
    .select()
    .single();
    
  if (error) throw new Error('Failed to toggle checklist item');
  
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_athlete_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw new Error('Failed to delete task');
}
