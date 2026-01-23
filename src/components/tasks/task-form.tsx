'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { EventTask, EventTaskFormData, TaskCategory, TaskPriority, TaskStatus, TASK_CATEGORY_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/types/task';
import { createEventTask, updateEventTask } from '@/lib/services/task-service';
import { useUser } from '@/hooks/use-user';
import { toast } from 'sonner';

const taskSchema = z.object({
  template_id: z.string().optional(),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  category: z.enum(['logistics', 'production', 'medical', 'security', 'media', 'hospitality', 'technical', 'administrative', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  checklist_items: z.array(z.string()),
  notes: z.string().optional(),
});

interface TaskFormProps {
  eventId: string;
  task?: EventTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TaskForm({ eventId, task, open, onOpenChange, onSuccess }: TaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const { user } = useUser();
  const isEditing = !!task;

  const form = useForm<EventTaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      template_id: '',
      name: '',
      description: '',
      category: 'logistics',
      priority: 'medium',
      status: 'pending',
      assigned_to: '',
      due_date: '',
      due_time: '',
      checklist_items: [],
      notes: '',
    },
  });

  const checklistItems = form.watch('checklist_items');

  useEffect(() => {
    if (task) {
      form.reset({
        template_id: task.template_id || '',
        name: task.name,
        description: task.description || '',
        category: task.category,
        priority: task.priority,
        status: task.status,
        assigned_to: task.assigned_to || '',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        checklist_items: task.checklist_items.map(item => item.text),
        notes: task.notes || '',
      });
    } else {
      form.reset({
        template_id: '',
        name: '',
        description: '',
        category: 'logistics',
        priority: 'medium',
        status: 'pending',
        assigned_to: '',
        due_date: '',
        due_time: '',
        checklist_items: [],
        notes: '',
      });
    }
  }, [task, form]);

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      form.setValue('checklist_items', [...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    form.setValue('checklist_items', checklistItems.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: EventTaskFormData) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      if (isEditing) {
        await updateEventTask(task.id, data);
        toast.success('Task updated');
      } else {
        await createEventTask(eventId, data, user.id);
        toast.success('Task created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update task' : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = Object.entries(TASK_CATEGORY_LABELS) as [TaskCategory, string][];
  const priorities = Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][];
  const statuses = Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name *</FormLabel>
                  <FormControl><Input placeholder="Enter task name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Task description..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {priorities.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {statuses.map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              <FormLabel>Checklist Items</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add checklist item..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                />
                <Button type="button" variant="outline" onClick={addChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="flex-1">{item}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
