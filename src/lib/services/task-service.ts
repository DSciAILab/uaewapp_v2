import { createClient } from '@/lib/supabase/client';
import { TaskTemplate, TaskTemplateFormData, EventTask, EventTaskFormData, TaskFilters, TaskStatus, TaskChecklistItem } from '@/types/task';

function getClient() {
  return createClient();
}

// ==================== TASK TEMPLATES ====================

export async function getTaskTemplates(activeOnly: boolean = false): Promise<TaskTemplate[]> {
  const supabase = getClient();
  let query = supabase
    .from('mma_task_templates')
    .select('*')
    .order('category')
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch task templates');

  return data || [];
}

export async function getTaskTemplateById(templateId: string): Promise<TaskTemplate | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_task_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createTaskTemplate(formData: TaskTemplateFormData): Promise<TaskTemplate> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_task_templates')
    .insert({
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      default_priority: formData.default_priority,
      estimated_duration_minutes: formData.estimated_duration_minutes || null,
      checklist_items: formData.checklist_items,
      is_active: formData.is_active,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create task template');

  return data;
}

export async function updateTaskTemplate(templateId: string, formData: Partial<TaskTemplateFormData>): Promise<TaskTemplate> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_task_templates')
    .update(formData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw new Error('Failed to update task template');

  return data;
}

export async function deleteTaskTemplate(templateId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_task_templates')
    .update({ is_active: false })
    .eq('id', templateId);

  if (error) throw new Error('Failed to delete task template');
}

// ==================== EVENT TASKS ====================

export async function getEventTasks(eventId: string, filters?: TaskFilters): Promise<EventTask[]> {
  const supabase = getClient();
  let query = supabase
    .from('mma_event_tasks')
    .select(`
      *,
      assigned_user:mma_users!mma_event_tasks_assigned_to_fkey(id, name),
      template:mma_task_templates(*)
    `)
    .eq('event_id', eventId)
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to);
  }

  const { data, error } = await query;

  if (error) throw new Error('Failed to fetch event tasks');

  let results = data || [];

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(task =>
      task.name.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower)
    );
  }

  return (results as any[]).map(task => ({
    ...task,
    assigned_user: task.assigned_user ? { id: task.assigned_user.id, full_name: task.assigned_user.name } : null
  }));
}

export async function getTaskById(taskId: string): Promise<EventTask | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .select(`
      *,
      assigned_user:mma_users!mma_event_tasks_assigned_to_fkey(id, name),
      template:mma_task_templates(*)
    `)
    .eq('id', taskId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const task = data as any;
  return {
    ...task,
    assigned_user: task.assigned_user ? { id: task.assigned_user.id, full_name: task.assigned_user.name } : null
  };
}

export async function createEventTask(eventId: string, formData: EventTaskFormData, userId: string): Promise<EventTask> {
  const checklistItems: TaskChecklistItem[] = formData.checklist_items.map(text => ({
    id: crypto.randomUUID(),
    text,
    completed: false,
    completed_at: null,
    completed_by: null,
  }));

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .insert({
      event_id: eventId,
      template_id: formData.template_id || null,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      assigned_by: formData.assigned_to ? userId : null,
      due_date: formData.due_date || null,
      due_time: formData.due_time || null,
      checklist_items: checklistItems,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create event task');

  return data;
}

export async function createTaskFromTemplate(eventId: string, templateId: string, userId: string, overrides?: Partial<EventTaskFormData>): Promise<EventTask> {
  const template = await getTaskTemplateById(templateId);
  if (!template) throw new Error('Template not found');

  const formData: EventTaskFormData = {
    template_id: templateId,
    name: overrides?.name || template.name,
    description: overrides?.description || template.description || undefined,
    category: overrides?.category || template.category,
    priority: overrides?.priority || template.default_priority,
    status: overrides?.status || 'pending',
    assigned_to: overrides?.assigned_to,
    due_date: overrides?.due_date,
    due_time: overrides?.due_time,
    checklist_items: overrides?.checklist_items || template.checklist_items,
    notes: overrides?.notes,
  };

  return createEventTask(eventId, formData, userId);
}

export async function updateEventTask(taskId: string, formData: Partial<EventTaskFormData>): Promise<EventTask> {
  const updateData: Record<string, unknown> = { ...formData };

  if (formData.checklist_items) {
    const current = await getTaskById(taskId);
    const existingItems = current?.checklist_items || [];
    
    updateData.checklist_items = formData.checklist_items.map(text => {
      const existing = existingItems.find(item => item.text === text);
      if (existing) return existing;
      return {
        id: crypto.randomUUID(),
        text,
        completed: false,
        completed_at: null,
        completed_by: null,
      };
    });
  }



  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to update event task');

  return data;
}

export async function deleteEventTask(taskId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_event_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw new Error('Failed to delete event task');
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<EventTask> {
  const updateData: Record<string, unknown> = { status };

  if (status === 'in_progress') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }



  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to update task status');

  return data;
}

export async function toggleChecklistItem(taskId: string, itemId: string, userId: string): Promise<EventTask> {
  const task = await getTaskById(taskId);
  if (!task) throw new Error('Task not found');

  const updatedItems = task.checklist_items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        completed: !item.completed,
        completed_at: !item.completed ? new Date().toISOString() : null,
        completed_by: !item.completed ? userId : null,
      };
    }
    return item;
  });

  const allCompleted = updatedItems.length > 0 && updatedItems.every(item => item.completed);

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update({ 
      checklist_items: updatedItems,
      status: allCompleted ? 'completed' : task.status,
      completed_at: allCompleted ? new Date().toISOString() : task.completed_at,
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to toggle checklist item');

  return data;
}

export async function assignTask(taskId: string, assigneeId: string | null, assignerId: string): Promise<EventTask> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .update({
      assigned_to: assigneeId,
      assigned_by: assigneeId ? assignerId : null,
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error('Failed to assign task');

  return data;
}

export async function getTaskStats(eventId: string): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  by_category: Record<string, number>;
}> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_event_tasks')
    .select('status, category, due_date')
    .eq('event_id', eventId);

  if (error) throw error;

  const tasks = data || [];
  const now = new Date();

  const byCategory: Record<string, number> = {};
  tasks.forEach(task => {
    byCategory[task.category] = (byCategory[task.category] || 0) + 1;
  });

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => 
      t.status !== 'completed' && 
      t.status !== 'cancelled' && 
      t.due_date && 
      new Date(t.due_date) < now
    ).length,
    by_category: byCategory,
  };
}
