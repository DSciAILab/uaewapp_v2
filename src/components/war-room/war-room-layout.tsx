'use client';

import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Monitor, Play, Pause, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface WarRoomLayoutProps {
  children: ReactNode;
  title: string;
  onTVModeToggle?: (enabled: boolean) => void;
  isTVMode?: boolean;
}

export function WarRoomLayout({ children, title, onTVModeToggle, isTVMode }: WarRoomLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-[#020617] text-slate-100 flex flex-col transition-all duration-700",
      isTVMode ? "fixed inset-0 z-[100] overflow-hidden" : "p-6"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-slate-800 pb-4 mb-6",
        isTVMode && "px-8 py-6 bg-slate-950/50 backdrop-blur-md mb-0"
      )}>
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
          <h1 className={cn(
            "font-black tracking-tighter uppercase",
            isTVMode ? "text-4xl" : "text-2xl"
          )}>
            {title}
            <span className="ml-2 text-slate-500 text-sm font-mono tracking-normal normal-case">V5.0.1</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onTVModeToggle && (
            <Button 
              variant="outline" 
              size={isTVMode ? "lg" : "sm"}
              className={cn(
                "border-slate-700 hover:bg-slate-800",
                isTVMode ? "bg-red-900/20 text-red-500 border-red-900" : "text-slate-400"
              )}
              onClick={() => onTVModeToggle(!isTVMode)}
            >
              <Monitor className="h-4 w-4 mr-2" />
              {isTVMode ? "Exit Tactical Mode" : "Tactical Mode (TV)"}
            </Button>
          )}
          <div className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            SIGNAL: <span className="text-green-500">OPTIMAL</span>
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
        <div className="h-12 bg-slate-950 border-t border-slate-800 px-8 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-2 italic">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Satellite Sync Active
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Realtime Engine: Connected
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-600">
            SYSTEM_TIME: {new Date().toISOString()}
          </div>
        </div>
      )}
    </div>
  );
}
