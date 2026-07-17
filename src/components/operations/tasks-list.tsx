'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, Clock, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { updateTaskStatus } from '@/lib/services/task-service';
import { EventTask, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TaskStatus } from '@/types/task';
import { cn } from '@/lib/utils';

interface TasksListProps {
  tasks: EventTask[];
  onRefresh?: () => void;
}

export function TasksList({ tasks, onRefresh }: TasksListProps) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, status);
        toast.success(`Task marked as ${TASK_STATUS_LABELS[status]}`);
        onRefresh?.();
      } catch (error) {
        toast.error('Failed to update task status');
        console.error(error);
      }
    });
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'cancelled': return <AlertTriangle className="h-5 w-5 text-gray-400" />;
      default: return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operational Tasks</CardTitle>
        <CardDescription>
          Required actions for this athlete (Blood work, Photoshoot, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No tasks assigned.
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                id={`task-${task.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getStatusIcon(task.status)}
                  </div>
                  <div>
                    <h4 className={cn("font-medium", task.status === 'completed' && "line-through text-muted-foreground")}>
                      {task.name}
                    </h4>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {task.category}
                      </Badge>
                      <Badge className={cn("text-xs text-white border-0", getPriorityColor(task.priority))}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isPending}>
                        {TASK_STATUS_LABELS[task.status]}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'pending')}>
                        Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                        In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')}>
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'cancelled')}>
                        Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
