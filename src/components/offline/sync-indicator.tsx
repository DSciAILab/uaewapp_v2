'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initWriteQueue, subscribeQueue, flush, type QueueState } from '@/lib/offline/write-queue';

/**
 * The venue-network status pill (UAE-23).
 *
 * Tells the staff, at a glance, whether their changes are saved: green when
 * everything is synced, amber with a count while writes wait for the network,
 * and a spinner while flushing. Tapping it forces a retry. Mounted once in the
 * dashboard shell; it also boots the write queue.
 */
export function SyncIndicator() {
  const [state, setState] = useState<QueueState>({ pending: 0, online: true, flushing: false, lastError: null });

  useEffect(() => {
    initWriteQueue();
    return subscribeQueue(setState);
  }, []);

  const synced = state.pending === 0;

  return (
    <button
      type="button"
      onClick={() => flush()}
      title={
        synced
          ? state.online ? 'All changes saved' : 'Offline — changes save when the network returns'
          : `${state.pending} change${state.pending === 1 ? '' : 's'} waiting to sync`
      }
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
        synced && state.online && 'text-emerald-600 hover:bg-emerald-500/10',
        !state.online && 'text-amber-600 hover:bg-amber-500/10',
        !synced && state.online && 'text-amber-600 hover:bg-amber-500/10 bg-amber-500/5'
      )}
    >
      {state.flushing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : state.online ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <CloudOff className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">
        {state.flushing ? 'Syncing…' : synced ? (state.online ? 'Synced' : 'Offline') : `${state.pending} pending`}
      </span>
    </button>
  );
}
