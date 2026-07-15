'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskChecklistItem } from '@/types/task';
import { toggleChecklistItem } from '@/lib/services/task-service';
import { useUser } from '@/hooks/use-user';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskChecklistProps {
  taskId: string;
  items: TaskChecklistItem[];
  onUpdate: () => void;
  readonly?: boolean;
}

export function TaskChecklist({ taskId, items, onUpdate, readonly = false }: TaskChecklistProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { user } = useUser();

  const handleToggle = async (itemId: string) => {
    if (readonly || !user?.id) return;

    setLoadingId(itemId);
    try {
      await toggleChecklistItem(taskId, itemId, user.id);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update checklist');
    } finally {
      setLoadingId(null);
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span>{completedCount} / {items.length} completed</span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-2 rounded-lg border ${
              item.completed ? 'bg-muted/50' : 'bg-background'
            }`}
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => handleToggle(item.id)}
              disabled={readonly || loadingId === item.id}
              className="mt-0.5"
            />
            <div className="flex-1">
              <p className={item.completed ? 'line-through text-muted-foreground' : ''}>
                {item.text}
              </p>
              {item.completed && item.completed_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Completed {format(new Date(item.completed_at), 'MMM dd, HH:mm')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
