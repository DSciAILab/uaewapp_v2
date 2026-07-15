'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuickToggle } from '@/types/war-room';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface QuickTogglePanelProps {
  toggles: QuickToggle[];
  onToggle: (id: string, newStatus: string) => Promise<void>;
}

export function QuickTogglePanel({ toggles, onToggle }: QuickTogglePanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      await onToggle(id, status);
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('confirm') || s.includes('done') || s.includes('complete') || s.includes('cleared')) 
      return <CheckCircle2 className="h-4 w-4" />;
    if (s.includes('pending') || s.includes('progress') || s.includes('schedule')) 
      return <Clock className="h-4 w-4" />;
    if (s.includes('error') || s.includes('failed') || s.includes('denied') || s.includes('cancel')) 
      return <XCircle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('confirm') || s.includes('done') || s.includes('complete') || s.includes('cleared')) 
      return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (s.includes('pending') || s.includes('progress') || s.includes('schedule')) 
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    if (s.includes('error') || s.includes('failed') || s.includes('denied') || s.includes('cancel')) 
      return 'text-red-500 bg-red-500/10 border-red-200/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
      <CardHeader className="bg-slate-950/50 pb-3 border-b border-slate-800">
        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-between">
          Quick Deployment Toggles
          <span className="text-[10px] lowercase font-normal tracking-normal text-slate-600 italic">One-click status updates</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-800/50">
          {toggles.length === 0 ? (
            <div className="p-8 text-center text-slate-600 text-xs italic">
              No active entities available for quick toggle.
            </div>
          ) : (
            toggles.map((toggle) => (
              <div key={toggle.id} className="p-4 flex items-center justify-between group hover:bg-slate-800/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-600 uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {toggle.entity_type}
                    </span>
                    <span className="text-xs font-black text-slate-200 uppercase letter-spacing-tight">
                      {toggle.label}
                    </span>
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                    getStatusColor(toggle.current_status)
                  )}>
                    {getStatusIcon(toggle.current_status)}
                    {toggle.current_status}
                  </div>
                </div>

                <div className="flex gap-1">
                  {toggle.available_statuses.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-8 text-[10px] font-black uppercase hover:bg-slate-700",
                        toggle.current_status === status ? "bg-slate-800 text-slate-300" : "text-slate-500"
                      )}
                      disabled={loadingId === toggle.id}
                      onClick={() => handleStatusChange(toggle.id, status)}
                    >
                      {loadingId === toggle.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : status}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
