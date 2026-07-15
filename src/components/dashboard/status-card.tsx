'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { ModuleStatus } from '@/types/dashboard';

interface StatusCardProps {
  status: ModuleStatus;
}

export function StatusCard({ status }: StatusCardProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'good': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">
          {status.label}
        </CardTitle>
        {getStatusIcon()}
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
            <Badge variant="destructive" className="animate-pulse">
              {status.alerts} Alert{status.alerts > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Progress value={status.progress} className={`h-2 ${getStatusColor()}`} />
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <span>{status.pending} Pending</span>
          <span>{status.completed} Done</span>
        </div>
      </CardContent>
    </Card>
  );
}
