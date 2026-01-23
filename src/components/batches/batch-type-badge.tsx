'use client';

import { Badge } from '@/components/ui/badge';
import { BatchType, BATCH_TYPE_LABELS, BATCH_TYPE_COLORS } from '@/types/batch';

interface BatchTypeBadgeProps {
  type: BatchType;
}

export function BatchTypeBadge({ type }: BatchTypeBadgeProps) {
  return (
    <Badge variant="outline" className={BATCH_TYPE_COLORS[type]}>
      {BATCH_TYPE_LABELS[type]}
    </Badge>
  );
}
