'use client';

import { Badge } from '@/components/ui/badge';
import { TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/task';
import { Clock, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { icon: any; className: string }> = {
  pending: { icon: Clock, className: 'bg-gray-100 text-gray-800 border-gray-200' },
  in_progress: { icon: Play, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

const priorityConfig: Record<TaskPriority, { className: string }> = {
  low: { className: 'bg-slate-100 text-slate-800 border-slate-200' },
  medium: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  high: { className: 'bg-orange-100 text-orange-800 border-orange-200' },
  urgent: { className: 'bg-red-100 text-red-800 border-red-200' },
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      {priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
