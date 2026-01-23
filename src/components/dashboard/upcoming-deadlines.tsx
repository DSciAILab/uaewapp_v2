'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { UpcomingDeadline } from '@/types/dashboard';
import { Clock, Plane, Calendar, CheckSquare, FileText, Hotel, HeartPulse } from 'lucide-react';

interface UpcomingDeadlinesProps {
  deadlines: UpcomingDeadline[];
}

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'flight': return Plane;
      case 'batch': return Calendar;
      case 'task': return CheckSquare;
      case 'visa': return FileText;
      case 'hotel': return Hotel;
      case 'medical': return HeartPulse;
      default: return Clock;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'medium': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deadlines.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground italic">
              No upcoming deadlines found.
            </p>
          ) : (
            deadlines.map((deadline) => {
              const Icon = getIcon(deadline.type);
              const date = new Date(deadline.datetime);
              const isOverdue = isPast(date);

              return (
                <div key={deadline.id} className="flex gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-md h-fit outline outline-1 outline-border ${isOverdue ? 'bg-red-50 animate-pulse' : 'bg-muted'}`}>
                    <Icon className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm truncate">{deadline.title}</h4>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold px-1.5 py-0 ${getUrgencyColor(deadline.urgency)}`}>
                        {deadline.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{deadline.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className={`text-[11px] font-medium ${isOverdue ? 'text-red-600' : 'text-primary'}`}>
                        {formatDistanceToNow(date, { addSuffix: true })}
                      </p>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <p className="text-[10px] text-muted-foreground">
                        {format(date, "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
