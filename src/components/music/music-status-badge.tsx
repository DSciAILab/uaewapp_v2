'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { MusicStatus } from '@/types/music';
import { CheckCircle, Clock, XCircle, Upload } from 'lucide-react';

type DSStatus = 'pending' | 'confirmed' | 'warning' | 'critical' | 'neutral';
type IconType = React.ComponentType<{ className?: string }>;

// Domain -> DS semantics. "pending" and "uploaded" both sit on the pending
// token (a track exists / is awaited but is not yet confirmed); their icons
// and labels keep them distinguishable. Colours come from the locked status
// tokens rather than the old light-only bg-*-100 / text-*-800 palette.
const statusConfig: Record<MusicStatus, { label: string; status: DSStatus; icon: IconType }> = {
  confirmed: { label: 'Confirmed', status: 'confirmed', icon: CheckCircle },
  pending: { label: 'Pending', status: 'pending', icon: Clock },
  uploaded: { label: 'Uploaded', status: 'pending', icon: Upload },
  not_provided: { label: 'Not Provided', status: 'neutral', icon: XCircle },
};

interface MusicStatusBadgeProps {
  status: MusicStatus;
}

export function MusicStatusBadge({ status }: MusicStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <StatusBadge status={config.status} icon={config.icon} label={config.label} />
  );
}
