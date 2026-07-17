'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/task';
import { Clock, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type DSStatus = 'pending' | 'confirmed' | 'warning' | 'critical' | 'neutral';
type IconType = React.ComponentType<{ className?: string }>;

// Domain -> DS semantics. This badge owns no palette of its own: colours come
// from the five locked status tokens, so it renders correctly on the zinc-950
// base instead of the old light-only bg-*-100 / text-*-800 pairs.
const statusConfig: Record<TaskStatus, { status: DSStatus; icon: IconType }> = {
  pending: { status: 'neutral', icon: Clock },
  in_progress: { status: 'pending', icon: Play },
  completed: { status: 'confirmed', icon: CheckCircle },
  cancelled: { status: 'critical', icon: XCircle },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <StatusBadge
      status={config.status}
      icon={config.icon}
      label={TASK_STATUS_LABELS[status]}
    />
  );
}

const priorityConfig: Record<TaskPriority, DSStatus> = {
  low: 'neutral',
  medium: 'pending',
  high: 'warning',
  urgent: 'critical',
};

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  return (
    <StatusBadge
      status={priorityConfig[priority]}
      icon={priority === 'urgent' ? AlertTriangle : undefined}
      label={TASK_PRIORITY_LABELS[priority]}
    />
  );
}
