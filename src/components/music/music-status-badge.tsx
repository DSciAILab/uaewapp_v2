'use client';

import { Badge } from '@/components/ui/badge';
import { MusicStatus } from '@/types/music';
import { CheckCircle, Clock, XCircle, Upload } from 'lucide-react';

interface MusicStatusBadgeProps {
  status: MusicStatus;
}

const statusConfig: Record<MusicStatus, { label: string; icon: any; className: string }> = {
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  not_provided: {
    label: 'Not Provided',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  uploaded: {
    label: 'Uploaded',
    icon: Upload,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export function MusicStatusBadge({ status }: MusicStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
