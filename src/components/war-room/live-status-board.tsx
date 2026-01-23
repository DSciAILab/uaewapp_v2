'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ShieldAlert, Users, Zap, Clock } from 'lucide-react';
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
        <Card key={status.id} className="bg-slate-900 border-slate-800 border-l-4 border-l-primary shadow-lg overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {status.category}
            </CardTitle>
            <div className={`h-2 w-2 rounded-full animate-pulse ${
              status.status === 'good' ? 'bg-green-500' :
              status.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-col">
              <span className="text-xs text-slate-300 font-medium">{status.label}</span>
              <div className="flex items-end justify-between mt-1">
                <span className="text-2xl font-black text-white">{status.value}</span>
                <span className="text-[9px] text-slate-500 font-mono">
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
