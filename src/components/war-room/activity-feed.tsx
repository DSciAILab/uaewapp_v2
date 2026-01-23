'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, ArrowUpRight, ArrowDownRight, RefreshCcw, Trash2, User } from 'lucide-react';
import { RealtimeUpdate } from '@/types/war-room';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  updates: RealtimeUpdate[];
}

export function ActivityFeed({ updates }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'insert': return <ArrowUpRight className="h-4 w-4 text-green-400" />;
      case 'update': return <RefreshCcw className="h-4 w-4 text-blue-400" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-400" />;
      default: return <Zap className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'flights': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'hotels': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'transport': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pre-event': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'tasks': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 flex flex-col h-full shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 py-4">
        <CardTitle className="text-lg font-black text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Live Signal Feed
        </CardTitle>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
          LIVE
        </Badge>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-0">
            {updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                <RefreshCcw className="h-10 w-10 animate-spin-slow opacity-20" />
                <p className="text-sm font-medium">Listening for incoming data signals...</p>
              </div>
            ) : (
              updates.map((update, idx) => (
                <div 
                  key={update.id} 
                  className={`flex gap-4 p-4 border-b border-slate-800 hover:bg-white/5 transition-colors ${idx === 0 ? 'bg-primary/5' : ''}`}
                >
                  <div className="mt-1">
                    {getIcon(update.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-1.5 py-0 ${getChannelColor(update.channel)}`}>
                          {update.channel}
                        </Badge>
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-tighter">
                          {update.table.replace('mma_', '')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {format(new Date(update.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-tight">
                      <span className="font-bold text-white capitalize">{update.type}</span> detected on system entry.
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <User className="h-3 w-3" />
                        <span>System Operator</span>
                      </div>
                      <div className="text-[10px] text-primary/60 font-mono">
                        SIG_ID: {update.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
