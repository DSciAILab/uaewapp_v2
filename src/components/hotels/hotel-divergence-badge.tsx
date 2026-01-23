'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import { DivergenceType } from '@/types/hotel';
import { formatDivergenceLabel } from '@/lib/utils/hotel-calculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HotelDivergenceBadgeProps {
  divergenceType: DivergenceType;
  isApproved: boolean;
  reason?: string | null;
}

const divergenceConfig: Record<DivergenceType, { icon: any; color: string; approvedColor: string }> = {
  pre_booking: {
    icon: Calendar,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    approvedColor: 'bg-green-100 text-green-800 border-green-200'
  },
  early_checkin: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approvedColor: 'bg-green-100 text-green-800 border-green-200'
  },
  late_checkout: {
    icon: Clock,
    color: 'bg-red-100 text-red-800 border-red-200',
    approvedColor: 'bg-green-100 text-green-800 border-green-200'
  }
};

export function HotelDivergenceBadge({ divergenceType, isApproved, reason }: HotelDivergenceBadgeProps) {
  const config = divergenceConfig[divergenceType] || divergenceConfig.pre_booking;
  const Icon = isApproved ? CheckCircle : config.icon;
  const colorClass = isApproved ? config.approvedColor : config.color;

  const badge = (
    <Badge variant="outline" className={`${colorClass} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      <span>{formatDivergenceLabel(divergenceType)}</span>
      {isApproved && <span className="text-xs ml-1">(Approved)</span>}
    </Badge>
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
