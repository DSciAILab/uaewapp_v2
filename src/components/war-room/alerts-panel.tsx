'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, AlertTriangle, Info, Bell } from 'lucide-react';
import { WarRoomAlert } from '@/types/war-room';
import { format } from 'date-fns';

interface AlertsPanelProps {
  alerts: WarRoomAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ShieldAlert className="h-4 w-4 text-status-critical" />;
      case 'error': return <ShieldAlert className="h-4 w-4 text-status-critical" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-status-warning" />;
      default: return <Info className="h-4 w-4 text-status-neutral" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-status-critical/10 border-status-critical/20 text-foreground';
      case 'error': return 'bg-status-critical/10 border-status-critical/20 text-foreground';
      case 'warning': return 'bg-status-warning/10 border-status-warning/20 text-foreground';
      default: return 'bg-status-neutral/10 border-status-neutral/20 text-foreground';
    }
  };

  return (
    <Card className="bg-surface-1 border-border shadow-xl overflow-hidden">
      <CardHeader className="py-4 border-b border-border bg-surface-0/50">
        <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Active Incident Alerts
          </div>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="h-5 text-[10px] animate-bounce">
              {alerts.length} NEW
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mb-2 opacity-10" />
              <p className="text-[10px] font-bold uppercase tracking-widest">No Active Alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`p-3 relative ${getSeverityStyles(alert.severity)}`}>
                <div className="flex gap-3">
                  <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        {alert.source}
                      </span>
                      <span className="numeric text-[9px] opacity-50">
                        {format(new Date(alert.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold leading-none mb-1 text-foreground">{alert.title}</h5>
                    <p className="text-[11px] leading-tight opacity-80">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
