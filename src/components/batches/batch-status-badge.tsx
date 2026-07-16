'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { BatchStatus, BATCH_STATUS_LABELS } from '@/types/batch';

type DSStatus = 'pending' | 'confirmed' | 'warning' | 'critical' | 'neutral';

// Domain -> DS semantics. Colours come from the five locked status tokens,
// replacing the old light-only bg-*-100 / text-*-800 palette.
const statusConfig: Record<BatchStatus, DSStatus> = {
  draft: 'neutral',
  scheduled: 'pending',
  in_progress: 'warning',
  completed: 'confirmed',
  cancelled: 'critical',
};

interface BatchStatusBadgeProps {
  status: BatchStatus;
}

export function BatchStatusBadge({ status }: BatchStatusBadgeProps) {
  return (
    <StatusBadge status={statusConfig[status]} label={BATCH_STATUS_LABELS[status]} />
  );
}
