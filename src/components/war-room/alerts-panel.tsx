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
      case 'critical': return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'error': return <ShieldAlert className="h-4 w-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-200';
      case 'error': return 'bg-red-500/10 border-red-500/20 text-red-200';
      case 'warning': return 'bg-orange-500/10 border-orange-500/20 text-orange-200';
      default: return 'bg-blue-500/10 border-blue-500/20 text-blue-200';
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
      <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/50">
        <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
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
        <div className="divide-y divide-slate-800">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
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
                      <span className="text-[9px] font-mono opacity-50">
                        {format(new Date(alert.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold leading-none mb-1 text-white">{alert.title}</h5>
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
