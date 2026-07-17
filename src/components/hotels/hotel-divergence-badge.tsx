'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import { DivergenceType } from '@/types/hotel';
import { formatDivergenceLabel } from '@/lib/utils/hotel-calculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type DSStatus = 'pending' | 'confirmed' | 'warning' | 'critical' | 'neutral';
type IconType = React.ComponentType<{ className?: string }>;

// Domain -> DS semantics. An approved divergence is always `confirmed`;
// otherwise the severity of the divergence itself drives the token. Colours
// come from the locked status tokens rather than the old light-only palette.
const divergenceConfig: Record<DivergenceType, { icon: IconType; status: DSStatus }> = {
  pre_booking: { icon: Calendar, status: 'warning' },
  early_checkin: { icon: Clock, status: 'warning' },
  late_checkout: { icon: Clock, status: 'critical' },
};

interface HotelDivergenceBadgeProps {
  divergenceType: DivergenceType;
  isApproved: boolean;
  reason?: string | null;
}

export function HotelDivergenceBadge({ divergenceType, isApproved, reason }: HotelDivergenceBadgeProps) {
  const config = divergenceConfig[divergenceType] || divergenceConfig.pre_booking;

  const badge = (
    <StatusBadge
      status={isApproved ? 'confirmed' : config.status}
      icon={isApproved ? CheckCircle : config.icon}
      label={
        isApproved
          ? `${formatDivergenceLabel(divergenceType)} (Approved)`
          : formatDivergenceLabel(divergenceType)
      }
    />
  );

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{badge}</div>
          </TooltipTrigger>
          <TooltipContent><p className="max-w-xs">{reason}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
