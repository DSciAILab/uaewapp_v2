'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusDot } from '@/components/ui/status-dot';
import { ModuleStatus } from '@/types/dashboard';

type DSStatus = 'pending' | 'confirmed' | 'warning' | 'critical' | 'neutral';

interface StatusCardProps {
  status: ModuleStatus;
}

// This card ran its own good/warning/critical vocabulary on a raw palette,
// parallel to the DS. Map it onto the locked semantics instead.
const DS_STATUS: Record<string, DSStatus> = {
  good: 'confirmed',
  warning: 'warning',
  critical: 'critical',
};

const PROGRESS_COLOR: Record<DSStatus, string> = {
  confirmed: 'bg-status-confirmed',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  pending: 'bg-status-pending',
  neutral: 'bg-muted',
};

export function StatusCard({ status }: StatusCardProps) {
  const dsStatus: DSStatus = DS_STATUS[status.status] ?? 'neutral';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">
          {status.label}
        </CardTitle>
        <StatusDot status={dsStatus} label={status.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{status.progress}%</p>
            <p className="text-xs text-muted-foreground">
              {status.completed} / {status.total} completed
            </p>
          </div>
          {status.alerts > 0 && (
            <StatusBadge
              status="critical"
              label={`${status.alerts} Alert${status.alerts > 1 ? 's' : ''}`}
            />
          )}
        </div>
        <Progress value={status.progress} className={`h-2 ${PROGRESS_COLOR[dsStatus]}`} />
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <span>{status.pending} Pending</span>
          <span>{status.completed} Done</span>
        </div>
      </CardContent>
    </Card>
  );
}
