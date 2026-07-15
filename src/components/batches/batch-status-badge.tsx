'use client';

import { Badge } from '@/components/ui/badge';
import { BatchStatus, BATCH_STATUS_LABELS } from '@/types/batch';

interface BatchStatusBadgeProps {
  status: BatchStatus;
}

const statusColors: Record<BatchStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export function BatchStatusBadge({ status }: BatchStatusBadgeProps) {
  return (
    <Badge variant="outline" className={statusColors[status]}>
      {BATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
