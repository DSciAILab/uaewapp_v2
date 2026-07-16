'use client';

import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Monitor, Play, Pause, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { StatusDot } from '@/components/ui/status-dot';

interface WarRoomLayoutProps {
  children: ReactNode;
  title: string;
  onTVModeToggle?: (enabled: boolean) => void;
  isTVMode?: boolean;
}

export function WarRoomLayout({ children, title, onTVModeToggle, isTVMode }: WarRoomLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-surface-0 text-foreground flex flex-col transition-all duration-base",
      isTVMode ? "fixed inset-0 z-[100] overflow-hidden" : "p-6"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-border pb-4 mb-6",
        isTVMode && "px-8 py-6 bg-surface-1/50 backdrop-blur-md mb-0"
      )}>
        <div className="flex items-center gap-4">
          <StatusDot status="critical" size="lg" label="Live" />
          <h1 className={cn(
            "font-black tracking-tighter uppercase",
            isTVMode ? "text-4xl" : "text-2xl"
          )}>
            {title}
            <span className="ml-2 text-muted-foreground text-sm font-mono tracking-normal normal-case">V5.0.1</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onTVModeToggle && (
            <Button 
              variant="outline" 
              size={isTVMode ? "lg" : "sm"}
              className={cn(
                "border-border hover:bg-surface-2",
                isTVMode
                  ? "bg-status-critical/10 text-status-critical border-status-critical/40"
                  : "text-muted-foreground"
              )}
              onClick={() => onTVModeToggle(!isTVMode)}
            >
              <Monitor className="h-4 w-4 mr-2" />
              {isTVMode ? "Exit Tactical Mode" : "Tactical Mode (TV)"}
            </Button>
          )}
          <div className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-1 rounded border border-border">
            SIGNAL: <span className="text-status-confirmed">OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col gap-6",
        isTVMode && "p-8 overflow-hidden"
      )}>
        {children}
      </div>

      {/* Footer / Status Bar (TV Mode Only) */}
      {isTVMode && (
        <div className="h-12 bg-surface-1 border-t border-border px-8 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-2 italic">
              <StatusDot status="neutral" size="sm" />
              Satellite Sync Active
            </span>
            <span className="flex items-center gap-2">
              <StatusDot status="confirmed" size="sm" />
              Realtime Engine: Connected
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            SYSTEM_TIME: {new Date().toISOString()}
          </div>
        </div>
      )}
    </div>
  );
}
