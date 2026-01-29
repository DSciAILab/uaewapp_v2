'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import { TaskTemplate, TaskTemplateFormData, TaskCategory, TaskPriority, TASK_CATEGORY_LABELS, TASK_PRIORITY_LABELS } from '@/types/task';
import { createTaskTemplate, updateTaskTemplate } from '@/lib/services/task-service';
import { toast } from 'sonner';

const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  category: z.enum(['logistics', 'production', 'medical', 'security', 'media', 'hospitality', 'technical', 'administrative', 'other']),
  default_priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimated_duration_minutes: z.coerce.number().min(0).optional(),
  checklist_items: z.array(z.string()),
  is_active: z.boolean().default(true),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TaskTemplateFormProps {
  template?: TaskTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TaskTemplateForm({ template, open, onOpenChange, onSuccess }: TaskTemplateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const isEditing = !!template;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      category: 'logistics',
      default_priority: 'medium',
      estimated_duration_minutes: undefined,
      checklist_items: [],
      is_active: true,
    },
  });

  const checklistItems = form.watch('checklist_items');

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || '',
        category: template.category,
        default_priority: template.default_priority,
        estimated_duration_minutes: template.estimated_duration_minutes || undefined,
        checklist_items: template.checklist_items || [],
        is_active: template.is_active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        category: 'logistics',
        default_priority: 'medium',
        estimated_duration_minutes: undefined,
        checklist_items: [],
        is_active: true,
      });
    }
  }, [template, form]);

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      form.setValue('checklist_items', [...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    form.setValue('checklist_items', checklistItems.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TaskTemplateFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateTaskTemplate(template.id, data);
        toast.success('Template updated');
      } else {
        await createTaskTemplate(data);
        toast.success('Template created');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update template' : 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = Object.entries(TASK_CATEGORY_LABELS) as [TaskCategory, string][];
  const priorities = Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'New Template'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., Weight-in Station Setup" {...field} /></FormControl>
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
                  <FormControl><Textarea placeholder="Template details..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Category</FormLabel>
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
                name="default_priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Priority</FormLabel>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Duration (mins)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>Enable or disable this template</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              <FormLabel>Default Checklist Items</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add item..."
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
