'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';
import { LiveStatus } from '@/types/war-room';
import { format } from 'date-fns';

interface LiveStatusBoardProps {
  statuses: LiveStatus[];
}

export function LiveStatusBoard({ statuses }: LiveStatusBoardProps) {
  const categories = Array.from(new Set(statuses.map(s => s.category)));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statuses.map((status) => (
        <Card key={status.id} className="bg-surface-1 border-border border-l-4 border-l-primary shadow-lg overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {status.category}
            </CardTitle>
            <StatusDot
              status={
                status.status === 'good'
                  ? 'confirmed'
                  : status.status === 'warning'
                    ? 'warning'
                    : 'critical'
              }
              size="sm"
            />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-col">
              <span className="text-xs text-foreground/80 font-medium">{status.label}</span>
              <div className="flex items-end justify-between mt-1">
                <span className="text-2xl font-black text-foreground">{status.value}</span>
                <span className="numeric text-[9px] text-muted-foreground">
                  {format(new Date(status.updated_at), 'HH:mm:ss')}
                </span>
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </Card>
      ))}
    </div>
  );
}
