'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityItem } from '@/types/dashboard';
import { formatDistanceToNow } from 'date-fns';
import { 
  Plane, 
  Hotel, 
  Car, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivitySummaryProps {
  activity: ActivityItem[];
}

export function ActivitySummary({ activity }: ActivitySummaryProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="h-3 w-3" />;
      case 'hotel': return <Hotel className="h-3 w-3" />;
      case 'transport': return <Car className="h-3 w-3" />;
      case 'visa': return <FileText className="h-3 w-3" />;
      case 'pre-event': return <ShieldCheck className="h-3 w-3" />;
      case 'task': return <CheckCircle2 className="h-3 w-3" />;
      default: return <ActivityItemIcon type={type} />;
    }
  };

  const getStatusColor = (action: string) => {
    if (action.includes('created') || action.includes('added')) return 'bg-green-500/10 text-green-600 border-green-200';
    if (action.includes('deleted') || action.includes('cancelled')) return 'bg-red-500/10 text-red-600 border-red-200';
    return 'bg-blue-500/10 text-blue-600 border-blue-200';
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Recent Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm italic">
            No recent signals intercepted.
          </div>
        ) : (
          <div className="space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex gap-3 items-start group">
                <div className={cn(
                  'h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
                  getStatusColor(item.action)
                )}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">
                      {item.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {item.actor ? <span className="font-bold text-slate-700">{item.actor}</span> : 'System'} {item.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItemIcon({ type }: { type: string }) {
  return <AlertCircle className="h-3 w-3" />;
}
